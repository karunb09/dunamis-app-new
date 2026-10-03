import React, { useMemo, useState } from "react";
import Swal from "sweetalert2";
import { toast } from "react-hot-toast";
import { FiLogIn } from "react-icons/fi";
import { useMyStaffToday, useStaffCheckIn, useStaffCheckOut } from "../../../hooks/useStaffCheckIns";
import { formatDuration, formatTime } from "../../../utils/checkInFormat";
import VisitFlags, { DayFlags, Pill } from "../../../components/checkIns/VisitFlags";
import {
  BranchOption,
  EmptyBox,
  LoadError,
  LoadingBlocks,
  LocationStrip,
  OpenVisitCard,
  RefusalBanner,
} from "../../../components/checkIns/CheckInParts";
import { nearestInsideId, useLiveFix, useNow } from "../../../components/checkIns/checkInHooks";

const hoursLabel = (hours) =>
  hours.closedToday
    ? "Closed today"
    : hours.opensAt
      ? `Open ${formatTime(hours.opensAt)} – ${formatTime(hours.closesAt)} today`
      : "Opening hours not set";

const HoursPill = ({ hours }) => (
  <Pill tone={hours.closedToday ? "sky" : "slate"}>{hoursLabel(hours)}</Pill>
);

const StaffTodayPanel = () => {
  const { data, isLoading, isError, error, refetch } = useMyStaffToday();
  const checkInMutation = useStaffCheckIn();
  const checkOutMutation = useStaffCheckOut();
  const now = useNow();
  const [selectedId, setSelectedId] = useState(null);
  const [refusal, setRefusal] = useState(null);

  const branches = useMemo(() => data?.branches || [], [data]);
  const hasBranches = branches.length > 0;
  const { fix, fixError, locating, firstReading, locate } = useLiveFix(hasBranches);
  const openVisit = data?.openVisit || null;

  // Where they physically are wins; otherwise the first branch open today.
  const defaultId = useMemo(
    () =>
      nearestInsideId(branches, fix) ||
      (branches.find((branch) => !branch.hours.closedToday) || branches[0])?._id ||
      null,
    [branches, fix]
  );
  const branch = branches.find((b) => b._id === (selectedId || defaultId)) || null;
  const busy = locating || checkInMutation.isPending || checkOutMutation.isPending;

  const freshFix = async () => {
    try {
      return await locate();
    } catch (err) {
      toast.error(err.message);
      return null;
    }
  };

  const showRefusal = (err) => {
    setRefusal(err.details?.distanceM != null || err.details?.accuracyM != null ? err.message : null);
    toast.error(err.message);
  };

  const handleCheckIn = async () => {
    if (!branch) return;
    const { isConfirmed } = await Swal.fire({
      title: `Check in at ${branch.branchName}?`,
      text: "Your time and location are recorded now and can't be changed afterwards.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Check in",
      confirmButtonColor: "#FF6B35",
    });
    if (!isConfirmed) return;

    setRefusal(null);
    const firstOfDay = !data.visits.length;
    const reading = await freshFix();
    if (!reading) return;
    try {
      const { visit } = await checkInMutation.mutateAsync({ branchId: branch._id, ...reading });
      const lateMs =
        firstOfDay && !visit.branchClosedToday && visit.branchOpensAt
          ? new Date(visit.checkIn.at) - new Date(visit.branchOpensAt)
          : 0;
      toast.success(
        lateMs > 0
          ? `Checked in at ${formatTime(visit.checkIn.at)} — ${Math.ceil(lateMs / 60000)} min after the branch opened`
          : `Checked in at ${formatTime(visit.checkIn.at)}`
      );
    } catch (err) {
      showRefusal(err);
    }
  };

  const handleCheckOut = async () => {
    const closesAt = openVisit.branchClosesAt && new Date(openVisit.branchClosesAt).getTime();
    const beforeClosing = !openVisit.branchClosedToday && closesAt && Date.now() < closesAt;
    const { isConfirmed } = await Swal.fire({
      title: `Check out of ${openVisit.branch.branchName}?`,
      text: beforeClosing
        ? `The branch closes at ${formatTime(closesAt)}. If this is your last stop today, leaving now is recorded as an early logout. Moving on to another branch is fine.`
        : "Your check-out time and location are recorded now and can't be changed afterwards.",
      icon: beforeClosing ? "warning" : "question",
      showCancelButton: true,
      confirmButtonText: "Check out",
      confirmButtonColor: "#059669",
    });
    if (!isConfirmed) return;

    setRefusal(null);
    const reading = await freshFix();
    if (!reading) return;
    try {
      const { visit } = await checkOutMutation.mutateAsync({ id: openVisit._id, ...reading });
      toast.success(`Checked out at ${formatTime(visit.checkOut.at)}`);
    } catch (err) {
      showRefusal(err);
    }
  };

  if (isLoading) return <LoadingBlocks />;
  if (isError) {
    return <LoadError title="Could not load today's check-ins" error={error} onRetry={() => refetch()} />;
  }

  if (!data.access.eligible) {
    return (
      <EmptyBox
        title="Nothing to check in to"
        text="Branch check-in is for AAs and BDEs who work at a centre. Your placement doesn't include a branch."
      />
    );
  }
  if (!hasBranches) {
    return (
      <EmptyBox
        title="No branch in your placement yet"
        text="You're set up to work at a centre, but no active branch is in your placement. Once an admin adds it, your branches appear here with a Check in button."
      />
    );
  }

  const day = data.day;
  const firstVisitIsOpen = openVisit && data.visits[0]?._id === openVisit._id;
  const closesAt = openVisit?.branchClosesAt;

  return (
    <div className="space-y-5">
      <LocationStrip
        fix={fix}
        locating={locating || firstReading}
        error={fixError}
        onRefresh={() => locate().catch(() => {})}
      />

      <RefusalBanner message={refusal} />

      {openVisit ? (
        <OpenVisitCard
          visit={openVisit}
          note={
            firstVisitIsOpen && day?.lateCheckIn && `${day.lateByMinutes} min after the branch opened`
          }
          footnote={
            !openVisit.branchClosedToday && closesAt && now < new Date(closesAt).getTime()
              ? `The branch closes at ${formatTime(closesAt)}. If this is your last stop today, checking out before then counts as an early logout.`
              : "Tap when you leave the branch. The time and your location are recorded when you tap."
          }
          onCheckOut={handleCheckOut}
          busy={busy}
        />
      ) : (
        <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">Not checked in</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">Where are you checking in?</h2>
          <p className="mt-1 text-sm text-slate-500">
            Pick the branch you're at. Visiting more than one today? Check out here and check in at
            the next — only your first check-in and last check-out of the day are judged.
          </p>
          <div className="mt-4 space-y-3">
            {branches.map((option) => (
              <BranchOption
                key={option._id}
                branch={option}
                fix={fix}
                selected={branch?._id === option._id}
                onSelect={setSelectedId}
              >
                <HoursPill hours={option.hours} />
              </BranchOption>
            ))}
          </div>
          <button
            type="button"
            onClick={handleCheckIn}
            disabled={!branch || busy}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF6B35] px-5 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-[#fd5a1f] active:scale-[0.97] disabled:opacity-60 sm:w-auto"
          >
            <FiLogIn />
            {checkInMutation.isPending
              ? "Checking in…"
              : locating
                ? "Reading location…"
                : `Check in${branch ? ` at ${branch.branchName}` : ""}`}
          </button>
          <p className="mt-3 text-xs text-slate-500">
            {data.visits.length
              ? "Checking in at another branch now is part of the same day."
              : "Tap when you arrive. Even a minute after the branch opens counts as a late login."}
          </p>
        </div>
      )}

      {day && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Today's record</h3>
              <p className="text-xs text-slate-500">Submitted check-ins can't be edited.</p>
            </div>
            <DayFlags day={day} />
          </div>
          <ul className="mt-4 space-y-3">
            {data.visits.map((visit) => (
              <li key={visit._id} className="rounded-2xl border border-slate-100 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-800">{visit.branch.branchName}</p>
                  <VisitFlags visit={visit} />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  In {formatTime(visit.checkIn.at, { seconds: true })}
                  {" → "}
                  {visit.checkOut
                    ? `Out ${formatTime(visit.checkOut.at, { seconds: true })} · ${formatDuration(visit.minutesOnSite)}`
                    : visit.isOpen
                      ? "still checked in"
                      : "closed without a check-out"}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default StaffTodayPanel;
