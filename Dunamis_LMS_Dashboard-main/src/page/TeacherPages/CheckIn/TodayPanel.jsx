import React, { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { toast } from "react-hot-toast";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiInbox,
  FiLogIn,
  FiLogOut,
  FiMapPin,
  FiNavigation,
  FiRefreshCw,
} from "react-icons/fi";
import { useCheckIn, useCheckOut, useMyCheckInToday } from "../../../hooks/useCheckIns";
import { getCurrentFix } from "../../../utils/geolocation";
import {
  distanceMeters,
  formatDistance,
  formatDuration,
  formatTime,
} from "../../../utils/checkInFormat";
import VisitFlags, { Pill } from "../../../components/checkIns/VisitFlags";

// Mirrors services/instructorCheckIn.js so the preview never promises a
// check-in the server will refuse.
const ACCURACY_ALLOWANCE_CAP_M = 100;

const useNow = (intervalMs = 30000) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
};

const fenceFor = (branch, fix) => {
  if (!branch?.geo || !fix) return null;
  const distanceM = distanceMeters(fix, branch.geo);
  return {
    distanceM,
    inside: distanceM - Math.min(fix.accuracyM, ACCURACY_ALLOWANCE_CAP_M) <= branch.radiusM,
  };
};

const classState = (cls, now) => {
  if (cls.coveredBy) return { tone: "emerald", label: "Checked in" };
  if (now >= new Date(cls.endAt).getTime()) return { tone: "rose", label: "No check-in" };
  if (now >= new Date(cls.startAt).getTime()) return { tone: "rose", label: "Not checked in" };
  return { tone: "slate", label: `Starts ${formatTime(cls.startAt)}` };
};

const classLabel = (cls) =>
  `${formatTime(cls.startAt)} – ${formatTime(cls.endAt)} · ${cls.courseName}${
    cls.slotType === "demo" ? " (demo)" : ""
  }`;

const EmptyBox = ({ title = "Nothing here yet", text }) => (
  <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-slate-400">
    <FiInbox className="text-2xl" />
    <p className="text-sm font-medium text-slate-500">{title}</p>
    <p className="max-w-sm text-xs">{text}</p>
  </div>
);

const LocationStrip = ({ fix, locating, error, onRefresh }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
    <div className="flex min-w-0 items-center gap-3">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          error ? "bg-rose-50 text-rose-600" : "bg-orange-50 text-[#FF6B35]"
        }`}
      >
        <FiNavigation />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800">
          {locating
            ? "Finding your location…"
            : error
              ? "Location unavailable"
              : fix
                ? `Location found · accurate to ±${fix.accuracyM} m`
                : "Location not read yet"}
        </p>
        <p className="text-xs text-slate-500">
          {error ||
            (fix
              ? `Read at ${formatTime(fix.deviceTime, { seconds: true })}. A fresh reading is taken when you tap.`
              : "Your location is only read when this page asks for it.")}
        </p>
      </div>
    </div>
    <button
      type="button"
      onClick={onRefresh}
      disabled={locating}
      className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-orange-300 hover:text-orange-600 disabled:opacity-60"
    >
      <FiRefreshCw className={locating ? "motion-safe:animate-spin" : ""} />
      Refresh
    </button>
  </div>
);

const BranchOption = ({ branch, fix, selected, onSelect, now }) => {
  const fence = fenceFor(branch, fix);
  const next = branch.classes.find((cls) => new Date(cls.endAt).getTime() > now);
  return (
    <button
      type="button"
      onClick={() => onSelect(branch._id)}
      aria-pressed={selected}
      className={`w-full rounded-2xl border p-4 text-left transition active:scale-[0.99] ${
        selected
          ? "border-orange-300 bg-orange-50 ring-2 ring-orange-100"
          : "border-slate-200 bg-white hover:border-orange-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`font-semibold ${selected ? "text-orange-700" : "text-slate-900"}`}>
            {branch.branchName}
          </p>
          <p className="truncate text-xs text-slate-500">
            {[branch.location, branch.cityName].filter(Boolean).join(" · ")}
          </p>
        </div>
        <span
          className={`mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${
            selected ? "border-[#FF6B35] bg-[#FF6B35]" : "border-slate-300"
          }`}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {next ? (
          <Pill tone="slate">Next: {classLabel(next)}</Pill>
        ) : (
          <Pill tone="slate">
            {branch.classes.length ? "Today's classes are over" : "No class here today"}
          </Pill>
        )}
        {!branch.pinned && <Pill tone="amber">No location pin — marked unverified</Pill>}
        {fence && (
          <Pill tone={fence.inside ? "emerald" : "rose"}>
            {formatDistance(fence.distanceM)} away · {fence.inside ? "inside" : "outside"} the{" "}
            {branch.radiusM} m zone
          </Pill>
        )}
      </div>
    </button>
  );
};

const OpenVisitCard = ({ visit, now, onCheckOut, busy }) => {
  const started = visit.classes.filter((cls) => new Date(cls.startAt).getTime() < now);
  const lastEnd = started.length
    ? Math.max(...started.map((cls) => new Date(cls.endAt).getTime()))
    : null;
  return (
    <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-emerald-600 to-teal-500 p-6 text-white shadow-lg shadow-emerald-900/10 motion-safe:animate-fade-in-up">
      <p className="text-xs font-semibold uppercase tracking-widest text-white/70">You're checked in</p>
      <h2 className="mt-1 text-2xl font-bold">{visit.branch.branchName}</h2>
      <p className="mt-1 text-sm text-white/85">
        Since {formatTime(visit.checkIn.at, { seconds: true })}
        {visit.flags.lateCheckIn && ` · ${visit.flags.lateByMinutes} min after your class started`}
        {visit.flags.locationUnverified && " · location unverified"}
      </p>
      {visit.classes.length > 0 && (
        <ul className="mt-4 space-y-1 text-sm text-white/90">
          {visit.classes.map((cls) => (
            <li key={cls.slotId} className="flex items-center gap-2">
              <FiCheckCircle className="shrink-0 text-white/70" />
              {classLabel(cls)}
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={onCheckOut}
        disabled={busy}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 text-base font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 active:scale-[0.97] disabled:opacity-60 sm:w-auto"
      >
        <FiLogOut />
        {busy ? "Checking out…" : "Check out"}
      </button>
      <p className="mt-3 text-xs text-white/70">
        {lastEnd && now < lastEnd
          ? `Your class runs until ${formatTime(lastEnd)} — checking out before then counts as an early logout.`
          : "Tap when you leave the branch. The time and your location are recorded when you tap."}
      </p>
    </div>
  );
};

const TodayPanel = () => {
  const { data, isLoading, isError, error, refetch } = useMyCheckInToday();
  const checkInMutation = useCheckIn();
  const checkOutMutation = useCheckOut();
  const now = useNow();
  const [fix, setFix] = useState(null);
  const [fixError, setFixError] = useState("");
  const [locating, setLocating] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [refusal, setRefusal] = useState(null);

  const locate = useCallback(async () => {
    setLocating(true);
    try {
      const reading = await getCurrentFix();
      setFix(reading);
      setFixError("");
      return reading;
    } catch (err) {
      setFixError(err.message);
      throw err;
    } finally {
      setLocating(false);
    }
  }, []);

  const branches = useMemo(() => data?.branches || [], [data]);
  const hasBranches = branches.length > 0;

  // First reading once there is a branch to measure against, so the list shows
  // distances straight away. An instructor with no centre is never asked for
  // their location at all.
  useEffect(() => {
    if (!hasBranches) return undefined;
    let cancelled = false;
    getCurrentFix()
      .then((reading) => {
        if (!cancelled) setFix(reading);
      })
      .catch((err) => {
        if (!cancelled) setFixError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [hasBranches]);
  const firstReading = hasBranches && !fix && !fixError;
  const openVisit = data?.openVisit || null;

  // Where they physically are wins; otherwise the branch with a class still to
  // come; otherwise the first one.
  const defaultId = useMemo(() => {
    const nearest = branches
      .map((branch) => ({ branch, fence: fenceFor(branch, fix) }))
      .filter(({ fence }) => fence?.inside)
      .sort((a, b) => a.fence.distanceM - b.fence.distanceM)[0]?.branch;
    if (nearest) return nearest._id;
    const upcoming = branches.find((branch) =>
      branch.classes.some((cls) => !cls.coveredBy && new Date(cls.endAt).getTime() > now)
    );
    return (upcoming || branches[0])?._id || null;
  }, [branches, fix, now]);

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
    const reading = await freshFix();
    if (!reading) return;
    try {
      const { visit } = await checkInMutation.mutateAsync({ branchId: branch._id, ...reading });
      toast.success(
        visit.flags.lateCheckIn
          ? `Checked in at ${formatTime(visit.checkIn.at)} — ${visit.flags.lateByMinutes} min after your class started`
          : `Checked in at ${formatTime(visit.checkIn.at)}`
      );
    } catch (err) {
      showRefusal(err);
    }
  };

  const handleCheckOut = async () => {
    const tappedAt = Date.now();
    const started = openVisit.classes.filter((cls) => new Date(cls.startAt).getTime() < tappedAt);
    const lastEnd = started.length
      ? Math.max(...started.map((cls) => new Date(cls.endAt).getTime()))
      : null;
    const early = lastEnd && tappedAt < lastEnd;
    const { isConfirmed } = await Swal.fire({
      title: `Check out of ${openVisit.branch.branchName}?`,
      text: early
        ? `Your class runs until ${formatTime(lastEnd)}. Checking out now is recorded as an early logout and can't be changed.`
        : "Your check-out time and location are recorded now and can't be changed afterwards.",
      icon: early ? "warning" : "question",
      showCancelButton: true,
      confirmButtonText: early ? "Check out early" : "Check out",
      confirmButtonColor: early ? "#e11d48" : "#059669",
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

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-16 rounded-2xl bg-slate-100" />
        <div className="h-56 rounded-[30px] bg-slate-100" />
        <div className="h-40 rounded-2xl bg-slate-100" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
        <p className="font-semibold text-rose-700">Could not load today's check-ins</p>
        <p className="mt-1 text-sm text-rose-600">{error?.message}</p>
        <button
          onClick={() => refetch()}
          className="mt-4 rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!hasBranches) {
    return data.mode === "offline" || data.mode === "hybrid" ? (
      <EmptyBox
        title="No centre linked to you yet"
        text="You're set up to teach at a centre, but the admin team hasn't linked you to a branch yet. Once they do, your branch and today's classes appear here with a Check in button."
      />
    ) : (
      <EmptyBox
        title="Nothing to check in to"
        text="Branch check-in is for instructors who teach at a centre. Your classes are online, so there's nothing to record here."
      />
    );
  }

  return (
    <div className="space-y-5">
      <LocationStrip
        fix={fix}
        locating={locating || firstReading}
        error={fixError}
        onRefresh={() => locate().catch(() => {})}
      />

      {refusal && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 motion-safe:animate-fade-in">
          <FiAlertTriangle className="mt-0.5 shrink-0 text-lg" />
          <div>
            <p className="font-semibold">Not recorded</p>
            <p>{refusal}</p>
          </div>
        </div>
      )}

      {openVisit ? (
        <OpenVisitCard
          visit={openVisit}
          now={now}
          onCheckOut={handleCheckOut}
          busy={busy}
        />
      ) : (
        <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">Not checked in</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">Where are you checking in?</h2>
          <p className="mt-1 text-sm text-slate-500">
            Pick the centre you're at. Your classes there today are linked to this check-in
            automatically — no need to choose a course.
          </p>
          <div className="mt-4 space-y-3">
            {branches.map((option) => (
              <BranchOption
                key={option._id}
                branch={option}
                fix={fix}
                now={now}
                selected={branch?._id === option._id}
                onSelect={setSelectedId}
              />
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
            Tap when you arrive. Even a minute after your class starts counts as a late login.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-base font-semibold text-slate-900">Today's classes</h3>
        <p className="text-xs text-slate-500">At the branches you teach from</p>
        <div className="mt-4 space-y-4">
          {branches.map((option) => (
            <div key={option._id}>
              <p className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <FiMapPin className="text-slate-400" />
                {option.branchName}
              </p>
              {option.classes.length ? (
                <ul className="mt-2 space-y-2">
                  {option.classes.map((cls) => {
                    const state = classState(cls, now);
                    return (
                      <li
                        key={cls.slotId}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-100 px-3 py-2.5 text-sm"
                      >
                        <span className="text-slate-700">{classLabel(cls)}</span>
                        <Pill tone={state.tone}>{state.label}</Pill>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-1 text-xs text-slate-400">No class here today.</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {data.visits.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-base font-semibold text-slate-900">Today's record</h3>
          <p className="text-xs text-slate-500">Submitted check-ins can't be edited.</p>
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

export default TodayPanel;
