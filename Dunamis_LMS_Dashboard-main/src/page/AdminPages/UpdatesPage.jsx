import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FiFilter, FiPlus, FiSearch } from "react-icons/fi";
import { LuArrowDownUp } from "react-icons/lu";
import dayjs from "dayjs";
import { getAllNotices, invalidateNotices } from "../../redux/AdminNotice/AdminNoticeSlice";
import RefreshButton from "../../components/RefreshButton";
import { resolveImageUrl } from "../../utils/resolveImageUrl";

const SORT_OPTIONS = [
  { value: "date-desc", label: "Newest first" },
  { value: "date-asc", label: "Oldest first" },
  { value: "subject-asc", label: "Subject A–Z" },
  { value: "subject-desc", label: "Subject Z–A" },
  { value: "creator-asc", label: "Creator A–Z" },
  { value: "creator-desc", label: "Creator Z–A" },
];

const ITEMS_PER_PAGE = 12;

export default function UpdatesPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { notices, listLoading: loading, error } = useSelector((state) => state.notice);

  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] = useState("date-desc");
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ status: "", sentTo: "", dateFrom: "", dateTo: "" });
  const [page, setPage] = useState(1);
  const sortRef = useRef(null);

  useEffect(() => { dispatch(getAllNotices()); }, [dispatch]);

  const handleRefresh = () => {
    dispatch(invalidateNotices());
    dispatch(getAllNotices());
  };

  useEffect(() => {
    const close = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const formatted = (notices || []).map((n) => ({
    id: n._id,
    date: dayjs(n.createdAt).format("DD MMM YYYY, hh:mm A"),
    dateRaw: n.createdAt,
    creator: `${n.creator?.name?.firstName || ""} ${n.creator?.name?.lastName || ""}`.trim() || "Admin",
    avatar: resolveImageUrl(n.creator?.image, "/profile-photo.png"),
    subject: n.title || "—",
    message: n.message || "",
    sentTo: n.targetUsers || "",
    status: n.status || "draft",
    sentAt: n.sentAt ? dayjs(n.sentAt).format("DD MMM YYYY") : null,
  }));

  let filtered = formatted.filter((u) =>
    [u.subject, u.creator, u.message, u.sentTo].join(" ").toLowerCase().includes(search.toLowerCase())
  );
  if (filters.status) filtered = filtered.filter((u) => u.status?.toLowerCase() === filters.status.toLowerCase());
  if (filters.sentTo) filtered = filtered.filter((u) => u.sentTo?.toLowerCase() === filters.sentTo.toLowerCase());
  if (filters.dateFrom) filtered = filtered.filter((u) => new Date(u.dateRaw) >= new Date(filters.dateFrom));
  if (filters.dateTo) filtered = filtered.filter((u) => new Date(u.dateRaw) <= new Date(filters.dateTo));

  const sorted = [...filtered].sort((a, b) => {
    switch (sortOption) {
      case "date-asc": return new Date(a.dateRaw) - new Date(b.dateRaw);
      case "date-desc": return new Date(b.dateRaw) - new Date(a.dateRaw);
      case "subject-asc": return a.subject.localeCompare(b.subject);
      case "subject-desc": return b.subject.localeCompare(a.subject);
      case "creator-asc": return a.creator.localeCompare(b.creator);
      case "creator-desc": return b.creator.localeCompare(a.creator);
      default: return 0;
    }
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));
  const paginated = sorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const uniqueStatuses = [...new Set((notices || []).map((n) => n.status).filter(Boolean))];
  const uniqueSentTo = [...new Set((notices || []).map((n) => n.targetUsers).filter(Boolean))];

  const clearFilters = () => setFilters({ status: "", sentTo: "", dateFrom: "", dateTo: "" });

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">Announcements</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Updates & Notices</h1>
        <p className="mt-1 text-sm text-slate-500">
          Broadcast notices and updates to students, instructors, or all users.
        </p>
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search updates..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative" ref={sortRef}>
            <button
              onClick={() => setSortOpen((p) => !p)}
              className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <LuArrowDownUp className="text-slate-500" />
              Sort
            </button>
            {sortOpen && (
              <ul className="absolute right-0 top-full z-40 mt-1 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                {SORT_OPTIONS.map(({ value, label }) => (
                  <li
                    key={value}
                    onClick={() => { setSortOption(value); setSortOpen(false); }}
                    className={`cursor-pointer px-4 py-2.5 text-sm transition hover:bg-slate-50 ${sortOption === value ? "font-semibold text-slate-900" : "text-slate-700"}`}
                  >
                    {label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            onClick={() => setFilterOpen(true)}
            className={`flex items-center gap-1.5 rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${activeFilterCount > 0 ? "border-orange-300 bg-orange-50 text-orange-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
          >
            <FiFilter />
            Filter
            {activeFilterCount > 0 && (
              <span className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[9px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          <RefreshButton onRefresh={handleRefresh} busy={loading} />

          <button
            onClick={() => navigate("/admin/updates/create-updates")}
            className="flex items-center gap-2 rounded-2xl bg-[#FF6B35] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#fd5a1f]"
          >
            <FiPlus />
            Create Update
          </button>
        </div>
      </div>

      {loading && !formatted.length ? (
        <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 py-20 text-center text-sm text-slate-500">
          Loading updates…
        </div>
      ) : error ? (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 py-20 text-center text-sm text-rose-600">
          Failed to load updates. Please refresh.
        </div>
      ) : paginated.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 py-20 text-center">
          <p className="text-sm font-medium text-slate-700">No updates found</p>
          <p className="mt-1 text-sm text-slate-400">
            {search || activeFilterCount > 0 ? "Try clearing your search or filters." : "Create your first update."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginated.map((u) => (
            <article
              key={u.id}
              className="rounded-[24px] border border-slate-200 bg-white p-4 transition hover:shadow-sm"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <img
                    src={u.avatar}
                    alt={u.creator}
                    className="h-10 w-10 shrink-0 rounded-full border border-slate-200 object-cover object-top"
                    onError={(e) => { e.target.src = "/profile-photo.png"; }}
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">{u.subject}</span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${
                          u.status?.toLowerCase() === "sent"
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                            : "bg-slate-100 text-slate-600 ring-slate-200"
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {u.status}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-slate-500">{u.creator}</p>
                    {u.message && (
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{u.message}</p>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-start gap-1.5 text-xs text-slate-500 sm:items-end">
                  <span>{u.date}</span>
                  {u.sentTo && (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 font-medium text-slate-600">
                      {u.sentTo}
                    </span>
                  )}
                  {u.sentAt && <span className="text-slate-400">Sent {u.sentAt}</span>}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">{page} / {totalPages}</span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {filterOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-t-[32px] bg-white p-6 sm:rounded-[32px]">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Filter Updates</h2>
              <button
                onClick={() => setFilterOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Status</span>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                >
                  <option value="">All statuses</option>
                  {uniqueStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Sent To</span>
                <select
                  value={filters.sentTo}
                  onChange={(e) => setFilters((p) => ({ ...p, sentTo: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                >
                  <option value="">All recipients</option>
                  {uniqueSentTo.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">From</span>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters((p) => ({ ...p, dateFrom: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">To</span>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters((p) => ({ ...p, dateTo: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={clearFilters}
                className="flex-1 rounded-2xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Clear all
              </button>
              <button
                onClick={() => { setPage(1); setFilterOpen(false); }}
                className="flex-1 rounded-2xl bg-[#FF6B35] py-2.5 text-sm font-semibold text-white transition hover:bg-[#fd5a1f]"
              >
                Apply filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
