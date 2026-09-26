import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import Swal from "sweetalert2";
import { FiCheck, FiX, FiSearch, FiInbox } from "react-icons/fi";
import {
  fetchScheduleChangeRequests,
  reviewScheduleChangeRequest,
  invalidateScheduleChangeRequests,
} from "../../../../redux/scheduleChangeRequests/scheduleChangeRequestSlice";
import RefreshButton from "../../../../components/RefreshButton";
import ActionProgressBar from "../../../../components/ActionProgressBar";
import SavingOverlay from "../../../../components/SavingOverlay";
import SlideOver from "../../../../components/SlideOver";
import PageTabBar from "../../../../components/PageTabBar";

const STATUS_BADGE = {
  pending: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  approved: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  rejected: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
};

const FILTER_TABS = ["pending", "approved", "rejected", "all"];

const DAY_LABELS = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

const convertTo12Hour = (time) => {
  const [h, m] = String(time || "").split(":");
  const hour = Number(h);
  if (!Number.isFinite(hour)) return time || "—";
  const period = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${m} ${period}`;
};

const describeSchedule = (snapshot) => {
  if (!snapshot) return "Class removed";
  const days = (snapshot.days || []).map((d) => DAY_LABELS[d] || d).join(" & ");
  return `${days} · ${convertTo12Hour(snapshot.startTime)} - ${convertTo12Hour(snapshot.endTime)}`;
};

const personName = (name) =>
  name ? [name.firstName, name.lastName].filter(Boolean).join(" ").trim() : "";

const instructorName = (request) =>
  personName(request.teacherId?.userId?.name) || "Instructor";

const ScheduleChangeRequests = () => {
  const dispatch = useDispatch();
  const { items, listLoading, reviewLoading, error } = useSelector(
    (state) => state.scheduleChangeRequests
  );

  const [filterTab, setFilterTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [slideOver, setSlideOver] = useState({ open: false, request: null });
  const [actioning, setActioning] = useState(null);

  useEffect(() => {
    dispatch(fetchScheduleChangeRequests());
  }, [dispatch]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const refresh = () => {
    dispatch(invalidateScheduleChangeRequests());
    dispatch(fetchScheduleChangeRequests());
  };

  const visible = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return items.filter((request) => {
      if (filterTab !== "all" && request.status !== filterTab) return false;
      if (!term) return true;
      return [instructorName(request), request.courseId?.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [items, filterTab, searchTerm]);

  const pendingCount = items.filter((request) => request.status === "pending").length;

  const review = async (request, status) => {
    const isApprove = status === "approved";
    const learners = request.affectedStudentIds?.length || 0;

    const confirm = await Swal.fire({
      title: isApprove ? "Approve this change?" : "Reject this change?",
      html: isApprove
        ? `<p style="margin:0 0 8px">${request.changeType === "remove" ? "The class will be removed" : `The class moves to <strong>${describeSchedule(request.requested)}</strong>`}.</p><p style="margin:0">${learners} learner(s) will be emailed.</p>`
        : `<p style="margin:0">The class keeps its current timing. The instructor sees your note.</p>`,
      input: "textarea",
      inputLabel: "Note for the instructor (optional)",
      inputAttributes: { "aria-label": "Note for the instructor" },
      showCancelButton: true,
      confirmButtonText: isApprove ? "Approve" : "Reject",
      confirmButtonColor: isApprove ? "#059669" : "#e11d48",
    });
    if (!confirm.isConfirmed) return;

    setActioning({ id: String(request._id), status });
    const toastId = toast.loading(
      isApprove ? "Applying the new timing…" : "Rejecting the request…"
    );

    try {
      const result = await dispatch(
        reviewScheduleChangeRequest({
          id: request._id,
          status,
          adminNote: confirm.value || "",
        })
      );

      if (result.meta.requestStatus === "fulfilled") {
        toast.success(isApprove ? "Change approved" : "Change rejected", { id: toastId });
        setSlideOver((prev) => ({ ...prev, open: false }));
        refresh();
        return;
      }
      toast.error(result.payload || "Could not review this request", { id: toastId });
    } finally {
      setActioning(null);
    }
  };

  const liveRequest = slideOver.request
    ? items.find((item) => String(item._id) === String(slideOver.request._id)) ||
      slideOver.request
    : null;

  const approving = actioning?.status === "approved";

  return (
    <div>
      <SavingOverlay
        show={Boolean(actioning)}
        label={
          approving
            ? "Applying the change and rebuilding upcoming classes…"
            : "Recording your decision…"
        }
      />
      <ActionProgressBar
        active={Boolean(actioning)}
        label={
          approving
            ? "Moving the class, updating the roster and notifying learners. This can take a few seconds."
            : "Rejecting the request and notifying the instructor."
        }
      />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">
            {pendingCount
              ? `${pendingCount} change(s) waiting on you`
              : "No changes waiting for approval"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search instructor or course"
              className="rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </div>
          <RefreshButton onRefresh={refresh} busy={listLoading} />
        </div>
      </div>

      <div className="mb-5">
        <PageTabBar tabs={FILTER_TABS} activeTab={filterTab} onChange={setFilterTab} />
      </div>

      {visible.length === 0 ? (
        <div className="rounded-[30px] border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <FiInbox className="mx-auto mb-3 text-3xl text-slate-300" />
          <p className="text-sm font-medium text-slate-900">Nothing here yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Instructors' schedule changes for classes with enrolled learners appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((request, index) => (
            <article
              key={request._id}
              style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
              className="motion-safe:animate-fade-in-up rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-900">
                    {instructorName(request)}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {request.courseId?.name || "Course"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_BADGE[request.status]}`}
                >
                  {request.status}
                </span>
              </div>

              <dl className="mt-4 space-y-2 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-400">Now</dt>
                  <dd className="text-slate-700">{describeSchedule(request.current)}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-400">
                    {request.changeType === "remove" ? "Requested" : "Moves to"}
                  </dt>
                  <dd className="font-medium text-slate-900">
                    {request.changeType === "remove"
                      ? "Remove this class"
                      : describeSchedule(request.requested)}
                  </dd>
                </div>
              </dl>

              <p className="mt-3 text-xs font-medium text-sky-700">
                {request.affectedStudentIds?.length || 0} enrolled learner(s) affected
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSlideOver({ open: true, request })}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  View details
                </button>
                {request.status === "pending" ? (
                  <>
                    <button
                      type="button"
                      disabled={reviewLoading}
                      onClick={() => review(request, "approved")}
                      className="inline-flex items-center gap-1.5 rounded-2xl bg-[#FF6B35] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#fd5a1f] active:scale-[0.97] disabled:opacity-60"
                    >
                      {actioning?.id === String(request._id) &&
                      actioning?.status === "approved" ? (
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      ) : (
                        <FiCheck />
                      )}
                      {actioning?.id === String(request._id) &&
                      actioning?.status === "approved"
                        ? "Approving…"
                        : "Approve"}
                    </button>
                    <button
                      type="button"
                      disabled={reviewLoading}
                      onClick={() => review(request, "rejected")}
                      className="inline-flex items-center gap-1.5 rounded-2xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
                    >
                      {actioning?.id === String(request._id) &&
                      actioning?.status === "rejected" ? (
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-rose-200 border-t-rose-600" />
                      ) : (
                        <FiX />
                      )}
                      {actioning?.id === String(request._id) &&
                      actioning?.status === "rejected"
                        ? "Rejecting…"
                        : "Reject"}
                    </button>
                  </>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      <SlideOver
        open={slideOver.open}
        onClose={() => setSlideOver((prev) => ({ ...prev, open: false }))}
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSlideOver((prev) => ({ ...prev, open: false }))}
              className="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700"
            >
              Close
            </button>
            {liveRequest?.status === "pending" ? (
              <button
                type="button"
                disabled={reviewLoading}
                onClick={() => review(liveRequest, "approved")}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#FF6B35] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#fd5a1f] disabled:opacity-60"
              >
                {actioning ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : null}
                {actioning ? "Applying…" : "Approve change →"}
              </button>
            ) : null}
          </div>
        }
      >
        {liveRequest ? (
          <div>
            <div className="rounded-b-[30px] bg-gradient-to-br from-[#FF6B35] to-[#fd8a4f] px-6 py-8 text-white">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/80">
                Schedule change
              </p>
              <h2 className="mt-1 text-xl font-bold">{instructorName(liveRequest)}</h2>
              <p className="mt-0.5 text-sm text-white/90">
                {liveRequest.courseId?.name || "Course"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 px-6 py-5">
              <div className="rounded-2xl border border-slate-200 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Learners</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {liveRequest.affectedStudentIds?.length || 0}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Type</p>
                <p className="mt-1 text-lg font-semibold capitalize text-slate-900">
                  {liveRequest.changeType}
                </p>
              </div>
            </div>

            <dl className="space-y-3 px-6 pb-6 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Current timing</dt>
                <dd className="text-right font-medium text-slate-900">
                  {describeSchedule(liveRequest.current)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Requested</dt>
                <dd className="text-right font-medium text-slate-900">
                  {liveRequest.changeType === "remove"
                    ? "Remove this class"
                    : describeSchedule(liveRequest.requested)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Requested on</dt>
                <dd className="text-right text-slate-700">
                  {liveRequest.createdAt
                    ? new Date(liveRequest.createdAt).toLocaleDateString()
                    : "—"}
                </dd>
              </div>
              {liveRequest.teacherNote ? (
                <div>
                  <dt className="text-slate-500">Instructor note</dt>
                  <dd className="mt-1 text-slate-700">{liveRequest.teacherNote}</dd>
                </div>
              ) : null}
              {liveRequest.adminNote ? (
                <div>
                  <dt className="text-slate-500">Admin note</dt>
                  <dd className="mt-1 text-slate-700">{liveRequest.adminNote}</dd>
                </div>
              ) : null}
            </dl>

            <div className="border-t border-slate-100 px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">
                Affected learners
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {(liveRequest.affectedStudentIds || []).map((student) => (
                  <li key={student._id || student}>
                    {personName(student?.userId?.name) || student?.userId?.email || "Learner"}
                  </li>
                ))}
                {(liveRequest.affectedStudentIds || []).length === 0 ? (
                  <li className="text-slate-400">None</li>
                ) : null}
              </ul>
            </div>
          </div>
        ) : null}
      </SlideOver>
    </div>
  );
};

export default ScheduleChangeRequests;
