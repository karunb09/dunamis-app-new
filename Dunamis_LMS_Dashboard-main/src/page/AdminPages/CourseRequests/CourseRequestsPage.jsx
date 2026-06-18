import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import Swal from "sweetalert2";
import {
  fetchAllRequests,
  updateCourseRequestStatus,
  updateCourseItemStatus,
} from "../../../redux/courseRequests/courseRequestSlice";
import DataCards from "../../../components/DataCards";
import PersonCard from "../../../components/cards/PersonCard";
import SlideOver from "../../../components/SlideOver";
import { resolveImageUrl, DEFAULT_AVATAR } from "../../../utils/resolveImageUrl";
import { getStoredToken } from "../../../utils/authSession";
import { FiCheck, FiX, FiSearch, FiChevronDown } from "react-icons/fi";

const BASE_URL = import.meta.env.VITE_BASE_URL;

const ITEM_BADGE = {
  pending: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  approved: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  rejected: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
};

const STATUS_BADGE = {
  pending: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  approved: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  rejected: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  mixed: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
};

const FILTER_TABS = ["all", "pending", "approved", "rejected", "mixed"];

const getInstructorName = (req) => {
  const detail = req.instructor?.teacherDetail?.name;
  if (detail) return `${detail.firstName || ""} ${detail.lastName || ""}`.trim();
  const user = req.instructor?.userId?.name;
  if (user) return `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return "Instructor";
};

const getStatusLabel = (req) => {
  if (req.status !== "mixed") return req.status;
  const approvedCount = req.courses.filter((c) => c.status === "approved").length;
  const rejectedCount = req.courses.filter((c) => c.status === "rejected").length;
  return `${approvedCount} approved, ${rejectedCount} rejected`;
};

const CourseRequestsPage = () => {
  const dispatch = useDispatch();
  const { allRequests, loading } = useSelector((state) => state.courseRequests);

  const [filterTab, setFilterTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [slideOver, setSlideOver] = useState({ open: false, request: null });
  const [courseOptions, setCourseOptions] = useState([]);
  const [itemActioning, setItemActioning] = useState(null);

  const fetchCoursesForCategory = async (categoryId) => {
    try {
      const res = await fetch(`${BASE_URL}/course/manage`, {
        headers: { Authorization: `Bearer ${getStoredToken()}` },
        credentials: "include",
      });
      const data = await res.json();
      const list = data.data || data.courses || [];
      const filtered = list.filter((c) => {
        const catId = c.category?._id || c.category;
        return catId?.toString() === categoryId?.toString();
      });
      setCourseOptions(filtered);
      return filtered;
    } catch {
      setCourseOptions([]);
      return [];
    }
  };

  const handleApproveItem = async (requestId, itemIndex, categoryId) => {
    const options = await fetchCoursesForCategory(categoryId);
    if (options.length === 0) {
      toast.error("No courses found for this category. Create one first.");
      return;
    }
    const result = await Swal.fire({
      title: "Approve Course Request",
      width: "min(440px, 92vw)",
      html: `
        <p style="margin:0 0 10px;font-size:13px;color:#64748b;text-align:left;">Select the course to assign this instructor to:</p>
        <select id="swal-course-select" style="width:100%;box-sizing:border-box;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px;font-size:14px;">
          <option value="">— Choose a course —</option>
          ${options.map((c) => `<option value="${c._id}">${c.name}</option>`).join("")}
        </select>
      `,
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "Approve & Assign",
      preConfirm: () => {
        const val = document.getElementById("swal-course-select")?.value;
        if (!val) { Swal.showValidationMessage("Please select a course"); }
        return val;
      },
    });
    if (!result.isConfirmed) return;
    setItemActioning(`${requestId}-${itemIndex}`);
    try {
      await dispatch(updateCourseItemStatus({ id: requestId, itemIndex, status: "approved", courseId: result.value })).unwrap();
      toast.success("Course approved and instructor assigned!");
    } catch (err) {
      toast.error(err || "Failed to approve");
    } finally {
      setItemActioning(null);
    }
  };

  const handleRejectItem = async (requestId, itemIndex) => {
    const result = await Swal.fire({
      title: "Reject this course?",
      width: "min(440px, 92vw)",
      input: "textarea",
      inputPlaceholder: "Optional notes for the instructor…",
      showCancelButton: true,
      confirmButtonColor: "#f43f5e",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "Yes, Reject",
    });
    if (!result.isConfirmed) return;
    setItemActioning(`${requestId}-${itemIndex}`);
    try {
      await dispatch(updateCourseItemStatus({ id: requestId, itemIndex, status: "rejected", adminNotes: result.value || "" })).unwrap();
      toast.success("Course rejected");
    } catch (err) {
      toast.error(err || "Failed to reject");
    } finally {
      setItemActioning(null);
    }
  };

  useEffect(() => {
    dispatch(fetchAllRequests(filterTab === "all" ? "" : filterTab));
  }, [dispatch, filterTab]);

  const handleUpdateStatus = async (id, newStatus) => {
    const result = await Swal.fire({
      title: `${newStatus === "approved" ? "Approve" : "Reject"} this request?`,
      width: "min(440px, 92vw)",
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
        statusBadge={{ label: getStatusLabel(req), className: STATUS_BADGE[req.status] || "" }}
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
          selectable={false}
        />
      )}

      {/* SlideOver */}
      <SlideOver
        open={slideOver.open}
        onClose={() => setSlideOver((prev) => ({ ...prev, open: false }))}
        footer={
          <button
            onClick={() => setSlideOver((prev) => ({ ...prev, open: false }))}
            className="w-full rounded-2xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
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

              {/* Requested courses — per-item review */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Requested Courses</p>
                <div className="space-y-3">
                  {liveReq.courses.map((c, i) => {
                    const actioning = itemActioning === `${liveReq._id}-${i}`;
                    return (
                      <div key={i} className="rounded-[16px] border border-slate-100 bg-white p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800">
                              {c.category?.name || "Unknown Category"}
                              {c.subCategory?.name ? ` — ${c.subCategory.name}` : ""}
                            </p>
                            {c.approvedCourseId && (
                              <p className="mt-0.5 text-xs text-emerald-600">
                                Assigned to: {c.approvedCourseId.name || "Course"}
                              </p>
                            )}
                            {c.adminNotes && (
                              <p className="mt-0.5 text-xs text-slate-400">{c.adminNotes}</p>
                            )}
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${ITEM_BADGE[c.status] || ""}`}>
                            {c.status}
                          </span>
                        </div>
                        {c.demoVideo && (
                          <video controls src={resolveImageUrl(c.demoVideo)} className="mt-2 w-full rounded-xl" />
                        )}
                        {c.status === "pending" && (
                          <div className="mt-2 flex gap-2">
                            <button
                              disabled={actioning}
                              onClick={() => handleApproveItem(liveReq._id, i, c.category?._id || c.category)}
                              className="flex items-center gap-1 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
                            >
                              <FiCheck size={11} /> {actioning ? "…" : "Approve"}
                            </button>
                            <button
                              disabled={actioning}
                              onClick={() => handleRejectItem(liveReq._id, i)}
                              className="flex items-center gap-1 rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                            >
                              <FiX size={11} /> Reject
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
};

export default CourseRequestsPage;
