import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import Swal from "sweetalert2";
import {
  fetchAllRequests,
  updateCourseRequestStatus,
} from "../../../redux/courseRequests/courseRequestSlice";
import DataCards from "../../../components/DataCards";
import PersonCard from "../../../components/cards/PersonCard";
import SlideOver from "../../../components/SlideOver";
import { resolveImageUrl, DEFAULT_AVATAR } from "../../../utils/resolveImageUrl";
import { FiCheck, FiX, FiSearch } from "react-icons/fi";

const STATUS_BADGE = {
  pending: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  approved: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  rejected: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
};

const FILTER_TABS = ["all", "pending", "approved", "rejected"];

const getInstructorName = (req) => {
  const detail = req.instructor?.teacherDetail?.name;
  if (detail) return `${detail.firstName || ""} ${detail.lastName || ""}`.trim();
  const user = req.instructor?.userId?.name;
  if (user) return `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return "Instructor";
};

const CourseRequestsPage = () => {
  const dispatch = useDispatch();
  const { allRequests, loading } = useSelector((state) => state.courseRequests);

  const [filterTab, setFilterTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [slideOver, setSlideOver] = useState({ open: false, request: null });

  useEffect(() => {
    dispatch(fetchAllRequests(filterTab === "all" ? "" : filterTab));
  }, [dispatch, filterTab]);

  const handleUpdateStatus = async (id, newStatus) => {
    const result = await Swal.fire({
      title: `${newStatus === "approved" ? "Approve" : "Reject"} this request?`,
      input: newStatus === "rejected" ? "textarea" : undefined,
      inputPlaceholder: "Optional notes for the instructor…",
      showCancelButton: true,
      confirmButtonColor: newStatus === "approved" ? "#10b981" : "#f43f5e",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: newStatus === "approved" ? "Yes, Approve" : "Yes, Reject",
    });
    if (!result.isConfirmed) return;
    try {
      await dispatch(
        updateCourseRequestStatus({ id, status: newStatus, adminNotes: result.value || "" })
      ).unwrap();
      toast.success(`Request ${newStatus}`);
      if (slideOver.request?._id === id) {
        setSlideOver((prev) => ({ ...prev, request: { ...prev.request, status: newStatus, adminNotes: result.value || "" } }));
      }
    } catch (err) {
      toast.error(err || "Failed to update status");
    }
  };

  const filtered = allRequests.filter((req) => {
    if (!searchTerm.trim()) return true;
    const name = getInstructorName(req).toLowerCase();
    const email = (req.instructor?.userId?.email || "").toLowerCase();
    const s = searchTerm.toLowerCase();
    return name.includes(s) || email.includes(s);
  });

  const renderCard = (req) => {
    const name = getInstructorName(req);
    const email = req.instructor?.userId?.email || "";
    const avatarSrc = resolveImageUrl(
      req.instructor?.teacherDetail?.profilePicture || req.instructor?.userId?.image,
      DEFAULT_AVATAR
    );
    const cats = req.courses.map((c) => c.category?.name).filter(Boolean).join(", ") || "—";

    return (
      <PersonCard
        key={req._id}
        name={name}
        subtitle={email}
        avatarSrc={avatarSrc}
        statusBadge={{ label: req.status, className: STATUS_BADGE[req.status] || "" }}
        meta={[
          { label: "Submitted", value: new Date(req.createdAt).toLocaleDateString() },
          { label: "Courses", value: req.courses.length },
          { label: "Type", value: req.requestType === "multiple" ? "Multiple" : "Single" },
          { label: "Categories", value: cats },
        ]}
        onView={() => setSlideOver({ open: true, request: req })}
        primaryLabel="Review"
        menuItems={[
          {
            label: "Approve",
            icon: <FiCheck size={13} />,
            disabled: req.status !== "pending",
            onClick: () => handleUpdateStatus(req._id, "approved"),
          },
          {
            label: "Reject",
            icon: <FiX size={13} />,
            danger: true,
            disabled: req.status !== "pending",
            onClick: () => handleUpdateStatus(req._id, "rejected"),
          },
        ]}
      />
    );
  };

  const slideReq = slideOver.request;
  const liveReq = allRequests.find((r) => r._id === slideReq?._id) || slideReq;

  return (
    <div className="min-h-screen bg-white p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">Admin</p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-950">Course Requests</h1>
        <p className="mt-1 text-sm text-slate-500">Review and approve instructor course requests.</p>
      </div>

      {/* Filter tabs + search */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`rounded-2xl border px-3 py-1.5 text-sm font-medium capitalize transition ${
                filterTab === tab
                  ? "border-orange-300 bg-orange-50 text-orange-700"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search instructor…"
            className="rounded-2xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-slate-900" />
        </div>
      ) : (
        <DataCards
          data={filtered}
          renderCard={renderCard}
          itemsPerPage={12}
          emptyMessage="No course requests found."
        />
      )}

      {/* SlideOver */}
      <SlideOver
        open={slideOver.open}
        onClose={() => setSlideOver((prev) => ({ ...prev, open: false }))}
        footer={
          liveReq?.status === "pending" ? (
            <div className="flex gap-3">
              <button
                onClick={() => handleUpdateStatus(liveReq._id, "rejected")}
                className="flex-1 rounded-2xl border border-rose-200 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
              >
                Reject
              </button>
              <button
                onClick={() => handleUpdateStatus(liveReq._id, "approved")}
                className="flex-1 rounded-2xl bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
              >
                Approve
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSlideOver((prev) => ({ ...prev, open: false }))}
              className="w-full rounded-2xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
          )
        }
      >
        {liveReq && (
          <div>
            {/* Instructor header */}
            <div className="bg-gradient-to-br from-[#FF6B35] to-[#fd5a1f] p-5 text-white">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 overflow-hidden rounded-full bg-white/20">
                  <img
                    src={resolveImageUrl(
                      liveReq.instructor?.teacherDetail?.profilePicture || liveReq.instructor?.userId?.image,
                      DEFAULT_AVATAR
                    )}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={(e) => { e.target.src = DEFAULT_AVATAR; }}
                  />
                </div>
                <div>
                  <p className="font-semibold">{getInstructorName(liveReq)}</p>
                  <p className="text-sm text-white/70">{liveReq.instructor?.userId?.email || ""}</p>
                </div>
                <span className={`ml-auto shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${STATUS_BADGE[liveReq.status] || ""}`}>
                  {liveReq.status}
                </span>
              </div>
            </div>

            <div className="p-5 space-y-6">
              {/* Request meta */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Request Type", value: liveReq.requestType === "multiple" ? "Multiple" : "Single" },
                  { label: "Submitted", value: new Date(liveReq.createdAt).toLocaleDateString() },
                  { label: "Courses", value: liveReq.courses.length },
                  { label: "Reviewed", value: liveReq.reviewedAt ? new Date(liveReq.reviewedAt).toLocaleDateString() : "—" },
                ].map((item) => (
                  <div key={item.label} className="rounded-[16px] border border-slate-100 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs text-slate-400">{item.label}</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-800">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Requested courses */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Requested Courses</p>
                <div className="space-y-3">
                  {liveReq.courses.map((c, i) => (
                    <div key={i} className="rounded-[16px] border border-slate-100 bg-white p-3">
                      <p className="text-sm font-medium text-slate-800">
                        {c.category?.name || "Unknown Category"}
                        {c.subCategory?.name ? ` — ${c.subCategory.name}` : ""}
                      </p>
                      {c.demoVideo && (
                        <video
                          controls
                          src={resolveImageUrl(c.demoVideo)}
                          className="mt-2 w-full rounded-xl"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Admin notes */}
              {liveReq.adminNotes && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Admin Notes</p>
                  <p className="rounded-[16px] border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">{liveReq.adminNotes}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
};

export default CourseRequestsPage;
