import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useQueryClient } from "@tanstack/react-query";
import { FaFilter, FaList, FaSearch, FaSortAmountDown, FaTh, FaUserCheck, FaUserSlash } from "react-icons/fa";
import { FiClipboard, FiEye, FiX } from "react-icons/fi";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import Swal from "sweetalert2";
import { updateUser } from "../../../../redux/User/UserSlice";
import { useStudentsByType, studentKeys } from "../../../../hooks/useStudents";
import DataCards from "../../../../components/DataCards";
import DataTable from "../../../../components/Table";
import PersonCard from "../../../../components/cards/PersonCard";
import RowActionsMenu from "../../../../components/RowActionsMenu";
import ExportMenu from "../../../../components/ExportMenu";
import usePersistedState from "../../../../hooks/usePersistedState";
import { exportToExcel } from "../../../../utils/exportToExcel";
import { getFeeStatus, getJoinDate } from "../../../../utils/feeStatus";
import { resolveImageUrl } from "../../../../utils/resolveImageUrl";
import { getStoredToken } from "../../../../utils/authSession";

const SORT_OPTIONS = [
    { value: "name", label: "Name" },
    { value: "courseName", label: "Course Name" },
    { value: "progress", label: "Progress" },
    { value: "feeStatus", label: "Fee Status" },
];

const FEE_STATUS_ORDER = { Overdue: 0, Due: 1, Paid: 2 };
const FEE_BADGES = {
    Paid: { label: "Paid", className: "bg-emerald-50 text-emerald-600", dot: true, dotClass: "bg-emerald-500" },
    Due: { label: "Due", className: "bg-amber-50 text-amber-600", dot: true, dotClass: "bg-amber-500" },
    Overdue: { label: "Overdue", className: "bg-rose-50 text-rose-600", dot: true, dotClass: "bg-rose-500" },
};
const PAGE_SIZE_OPTIONS = [12, 24, 48, 96];

const formatDate = (date) => (date ? dayjs(date).format("DD MMM YYYY") : "—");

const MODE_BADGE_CLASS = {
    online: "bg-emerald-50 text-emerald-600",
    offline: "bg-sky-50 text-sky-600",
    hybrid: "bg-purple-50 text-purple-600",
};

const modeBadge = (mode) =>
    mode ? (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
            MODE_BADGE_CLASS[mode] || "bg-slate-50 text-slate-600"
        }`}>
            {mode}
        </span>
    ) : (
        "N/A"
    );

const EnrolledStudents = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [sortOpen, setSortOpen] = useState(false);
    const [sortOption, setSortOption] = useState("");
    const [filterOpen, setFilterOpen] = useState(false);
    const [filters, setFilters] = useState({ category: "", feeStatus: "", mode: "", joinFrom: "", joinTo: "" });
    const [view, setView] = usePersistedState("enrolledStudentsView", "cards");
    const [pageSize, setPageSize] = usePersistedState("enrolledStudentsPageSize", 12);
    const [selectedIds, setSelectedIds] = useState([]);
    const [exporting, setExporting] = useState(false);
    const [processingAction, setProcessingAction] = useState(null);
    const sortRef = useRef();
    const authToken = useSelector((state) => state.auth.token);
    const token = authToken || getStoredToken();

    const { data: studentsByType, isLoading, error } = useStudentsByType();

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const rows = (studentsByType?.enrolled || []).map((s, index) => {
        const courses = (s.enrolledCourses || [])
            .filter((c) => c.active !== false)
            .map((c) => ({
            name: c.courseId?.name || "Unknown Course",
            code: c.courseId?.code || "",
            category: c.courseId?.category?.name || "",
            mode: c.courseId?.mode || "",
            progress: c.progress ?? null,
        }));
        const progressValues = courses.map((c) => c.progress).filter((p) => p != null);
        return {
            _id: s._id,
            raw: s,
            mockId: `#ERD-${1000 + index}`,
            userDocId: s.userId?._id,
            accountStatus: (s.userId?.accountStatus || "active").toLowerCase(),
            name: `${s.userId?.name?.firstName || ""} ${s.userId?.name?.lastName || ""}`.trim() || "Unknown",
            email: s.userId?.email || "",
            phone: s.userId?.mobileNo != null ? String(s.userId.mobileNo) : "",
            avatar: resolveImageUrl(s.userId?.image, "/profile-photo.png"),
            courses,
            categories: [...new Set(courses.map((c) => c.category).filter(Boolean))],
            avgProgress: progressValues.length
                ? Math.round(progressValues.reduce((sum, p) => sum + p, 0) / progressValues.length)
                : null,
            mode: s.mode || courses[0]?.mode || "",
            feeStatus: getFeeStatus(s),
            joinedAt: getJoinDate(s),
        };
    });

    const categoryOptions = [...new Set(rows.flatMap((r) => r.categories))].sort();

    let displayed = rows;
    if (filters.category) displayed = displayed.filter((r) => r.categories.includes(filters.category));
    if (filters.feeStatus) displayed = displayed.filter((r) => r.feeStatus === filters.feeStatus);
    if (filters.mode) displayed = displayed.filter((r) => r.mode === filters.mode);
    if (filters.joinFrom) {
        const from = new Date(filters.joinFrom);
        displayed = displayed.filter((r) => r.joinedAt && r.joinedAt >= from);
    }
    if (filters.joinTo) {
        const to = new Date(`${filters.joinTo}T23:59:59`);
        displayed = displayed.filter((r) => r.joinedAt && r.joinedAt <= to);
    }

    const query = searchTerm.trim().toLowerCase();
    if (query) {
        displayed = displayed.filter((r) =>
            [r.name, r.email, r.phone, ...r.courses.map((c) => c.name)].some((v) =>
                v.toLowerCase().includes(query)
            )
        );
    }

    if (sortOption) {
        displayed = [...displayed].sort((a, b) => {
            switch (sortOption) {
                case "name": return a.name.localeCompare(b.name);
                case "courseName": return (a.courses[0]?.name || "").localeCompare(b.courses[0]?.name || "");
                case "progress": return (b.avgProgress ?? -1) - (a.avgProgress ?? -1);
                case "feeStatus": return FEE_STATUS_ORDER[a.feeStatus] - FEE_STATUS_ORDER[b.feeStatus];
                default: return 0;
            }
        });
    }

    const handleRowClick = (student) => {
        const studentId = student?._id;
        if (!studentId) {
            toast.error("Invalid student data — cannot open profile.");
            return;
        }
        navigate(
            `/admin/student-management/students/${encodeURIComponent(studentId)}`,
            { state: { student } }
        );
    };

    const handleCopyDetails = (selectedRows) => {
        const list = Array.isArray(selectedRows) ? selectedRows : [selectedRows];
        if (!list.length) return toast.error("No student data to copy!");
        const details = list
            .map((r) => {
                const courses = r.courses
                    .map((c) => `- ${c.name}${c.code ? ` (${c.code})` : ""} — Progress: ${c.progress != null ? `${c.progress}%` : "N/A"}${c.mode ? `, ${c.mode}` : ""}`)
                    .join("\n");
                return `Name: ${r.name}
Email: ${r.email}
Mobile: ${r.phone || "N/A"}
Fee Status: ${r.feeStatus}
Joined: ${formatDate(r.joinedAt)}
Courses:
${courses || "No courses enrolled"}`;
            })
            .join("\n\n====================\n\n");
        navigator.clipboard.writeText(details)
            .then(() => toast.success("Details copied!"))
            .catch(() => toast.error("Failed to copy!"));
    };

    const EXPORT_COLUMNS = [
        { header: "Name", value: (r) => r.name, width: 24 },
        { header: "Email", value: (r) => r.email, width: 30 },
        { header: "Phone", value: (r) => r.phone, width: 16 },
        { header: "Courses", value: (r) => r.courses.map((c) => c.name).join("; "), width: 36 },
        { header: "Category", value: (r) => r.categories.join("; "), width: 18 },
        { header: "Avg Progress", value: (r) => (r.avgProgress != null ? `${r.avgProgress}%` : "") },
        { header: "Mode", value: (r) => r.mode },
        { header: "Fee Status", value: (r) => r.feeStatus },
        { header: "Joined", value: (r) => formatDate(r.joinedAt), width: 14 },
    ];

    const runExport = async (list) => {
        if (!list.length) return toast.error("Nothing to export");
        setExporting(true);
        try {
            await exportToExcel({
                fileName: `enrolled-students-${dayjs().format("YYYY-MM-DD")}`,
                sheetName: "Enrolled Students",
                columns: EXPORT_COLUMNS,
                rows: list,
            });
            toast.success(`Exported ${list.length} student${list.length === 1 ? "" : "s"}`);
        } catch {
            toast.error("Export failed");
        } finally {
            setExporting(false);
        }
    };

    const handleToggleStatus = async (row) => {
        const nextStatus = row.accountStatus === "active" ? "inactive" : "active";
        const actionLabel = nextStatus === "inactive" ? "disable" : "enable";
        if (!window.confirm(`Do you want to ${actionLabel} ${row.name}? Disabling blocks their login.`)) return;

        const actionKey = `status-${row._id}`;
        setProcessingAction(actionKey);
        const toastId = toast.loading(`Updating status for ${row.name}…`);
        try {
            await dispatch(updateUser({ id: row.userDocId, userData: { accountStatus: nextStatus }, token })).unwrap();
            queryClient.invalidateQueries({ queryKey: studentKeys.all });
            toast.dismiss(toastId);
            await Swal.fire({
                icon: "success",
                title: "Student status updated",
                text: `${row.name} is now ${nextStatus === "active" ? "enabled" : "disabled"}.`,
                confirmButtonColor: "#0f172a",
            });
        } catch (err) {
            toast.dismiss(toastId);
            await Swal.fire({
                icon: "error",
                title: "Action failed",
                text: err?.message || `Could not update status for ${row.name}.`,
                confirmButtonColor: "#dc2626",
            });
        } finally {
            setProcessingAction(null);
        }
    };

    const buildMenuItems = (row) => [
        {
            label: "View Profile",
            icon: <FiEye size={14} />,
            onClick: () => handleRowClick(row.raw),
        },
        {
            label: "Copy Details",
            icon: <FiClipboard size={14} />,
            onClick: () => handleCopyDetails([row]),
        },
        {
            label: row.accountStatus === "active" ? "Disable" : "Enable",
            icon: row.accountStatus === "active" ? <FaUserSlash size={13} /> : <FaUserCheck size={13} />,
            disabled: Boolean(processingAction),
            onClick: () => handleToggleStatus(row),
        },
    ];

    const DISABLED_BADGE = { label: "Disabled", className: "bg-slate-200 text-slate-600", dot: true, dotClass: "bg-slate-400" };
    const cardStatusBadge = (row) => (row.accountStatus !== "active" ? DISABLED_BADGE : FEE_BADGES[row.feeStatus]);
    const accountStatusBadge = (row) =>
        row.accountStatus === "active"
            ? { label: "Active", className: "bg-emerald-50 text-emerald-600", dot: true, dotClass: "bg-emerald-500" }
            : DISABLED_BADGE;

    const tableColumns = [
        {
            key: "student",
            header: "Student",
            minWidth: "220px",
            render: (_, row) => (
                <div className="flex items-center gap-3">
                    <img
                        src={row.avatar}
                        alt={row.name}
                        className="h-9 w-9 shrink-0 rounded-xl object-cover object-top"
                        onError={(e) => { e.target.onerror = null; e.target.src = "/profile-photo.png"; }}
                    />
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{row.name}</p>
                        <p className="truncate text-xs text-slate-500">{row.email}</p>
                    </div>
                </div>
            ),
        },
        {
            key: "course",
            header: "Course",
            minWidth: "170px",
            render: (_, row) => (
                <div className="min-w-0">
                    <p className="truncate text-sm text-slate-700">{row.courses[0]?.name || "—"}</p>
                    {row.courses.length > 1 && (
                        <p className="text-xs text-slate-400">+{row.courses.length - 1} more</p>
                    )}
                </div>
            ),
        },
        {
            key: "category",
            header: "Category",
            minWidth: "120px",
            render: (_, row) => row.categories.join(", ") || "—",
        },
        {
            key: "progress",
            header: "Progress",
            minWidth: "100px",
            nowrap: true,
            render: (_, row) => (row.avgProgress != null ? `${row.avgProgress}%` : "—"),
        },
        {
            key: "mode",
            header: "Mode",
            minWidth: "100px",
            nowrap: true,
            render: (_, row) => modeBadge(row.mode),
        },
        {
            key: "feeStatus",
            header: "Fee Status",
            minWidth: "110px",
            nowrap: true,
            render: (_, row) => {
                const badge = FEE_BADGES[row.feeStatus];
                return (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${badge.className}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${badge.dotClass}`} />
                        {badge.label}
                    </span>
                );
            },
        },
        {
            key: "joinedAt",
            header: "Joined",
            minWidth: "120px",
            nowrap: true,
            render: (_, row) => formatDate(row.joinedAt),
        },
        {
            key: "status",
            header: "Status",
            minWidth: "100px",
            nowrap: true,
            render: (_, row) => {
                const badge = accountStatusBadge(row);
                return (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${badge.className}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${badge.dotClass}`} />
                        {badge.label}
                    </span>
                );
            },
        },
        {
            key: "actions",
            header: "",
            minWidth: "70px",
            render: (_, row) => <RowActionsMenu items={buildMenuItems(row)} />,
        },
    ];

    const selectedRows = displayed.filter((r) => selectedIds.includes(r._id));
    const activeFilterCount = Object.values(filters).filter(Boolean).length;

    const sharedListProps = {
        data: displayed,
        itemsPerPage: pageSize,
        itemsPerPageOptions: PAGE_SIZE_OPTIONS,
        onItemsPerPageChange: setPageSize,
        onSelectionChange: setSelectedIds,
        emptyMessage: "No enrolled students found.",
        onCopyDetails: handleCopyDetails,
    };

    return (
        <>
            {isLoading && <p className="mb-4 text-sm text-slate-500">Loading students…</p>}
            {error && <p className="mb-4 text-sm text-rose-500">Error: {error.message}</p>}

            {/* Toolbar */}
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full lg:w-72">
                    <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                    <input
                        type="text"
                        placeholder="Search students…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center rounded-2xl border border-slate-200 bg-white p-1">
                        <button
                            type="button"
                            onClick={() => setView("cards")}
                            aria-label="Card view"
                            className={`rounded-xl px-3 py-1.5 transition-colors ${
                                view === "cards" ? "bg-orange-50 text-orange-600" : "text-slate-400 hover:text-slate-600"
                            }`}
                        >
                            <FaTh size={13} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setView("list")}
                            aria-label="List view"
                            className={`rounded-xl px-3 py-1.5 transition-colors ${
                                view === "list" ? "bg-orange-50 text-orange-600" : "text-slate-400 hover:text-slate-600"
                            }`}
                        >
                            <FaList size={13} />
                        </button>
                    </div>
                    <div className="relative" ref={sortRef}>
                        <button
                            type="button"
                            onClick={() => setSortOpen(!sortOpen)}
                            className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${
                                sortOption
                                    ? "border-orange-200 bg-orange-50 text-orange-600"
                                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            }`}
                        >
                            <FaSortAmountDown size={13} /> Sort
                        </button>
                        {sortOpen && (
                            <div className="absolute right-0 z-40 mt-2 w-48 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-lg shadow-slate-200/50">
                                {SORT_OPTIONS.map(({ value, label }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => { setSortOption(value); setSortOpen(false); }}
                                        className={`flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 ${
                                            sortOption === value
                                                ? "bg-orange-50 font-semibold text-orange-600"
                                                : "text-slate-700"
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => setFilterOpen(true)}
                        className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${
                            activeFilterCount
                                ? "border-orange-200 bg-orange-50 text-orange-600"
                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                    >
                        <FaFilter size={13} />
                        Filter
                        {activeFilterCount > 0 && (
                            <span className="rounded-full bg-[#FF6B35] px-2 py-0.5 text-xs font-semibold text-white">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                    <ExportMenu
                        onExportAll={() => runExport(displayed)}
                        onExportSelected={() => runExport(selectedRows)}
                        totalCount={displayed.length}
                        selectedCount={selectedRows.length}
                        exporting={exporting}
                    />
                </div>
            </div>

            {/* Filter modal */}
            {filterOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4">
                    <div className="relative max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:max-w-sm sm:rounded-3xl">
                        <button
                            type="button"
                            onClick={() => setFilterOpen(false)}
                            className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        >
                            <FiX size={18} />
                        </button>
                        <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">Filter</p>
                        <h2 className="mt-1 text-lg font-bold text-slate-900">Filter students</h2>

                        <div className="mt-5 space-y-4">
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Category</label>
                                <select
                                    value={filters.category}
                                    onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                >
                                    <option value="">All categories</option>
                                    {categoryOptions.map((cat) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Fee Status</label>
                                <select
                                    value={filters.feeStatus}
                                    onChange={(e) => setFilters((f) => ({ ...f, feeStatus: e.target.value }))}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                >
                                    <option value="">All</option>
                                    <option value="Paid">Paid</option>
                                    <option value="Due">Due</option>
                                    <option value="Overdue">Overdue</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Enrollment Mode</label>
                                <select
                                    value={filters.mode}
                                    onChange={(e) => setFilters((f) => ({ ...f, mode: e.target.value }))}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                >
                                    <option value="">All</option>
                                    <option value="online">Online</option>
                                    <option value="offline">Offline</option>
                                    <option value="hybrid">Hybrid</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Joined From</label>
                                <input
                                    type="date"
                                    value={filters.joinFrom}
                                    onChange={(e) => setFilters((f) => ({ ...f, joinFrom: e.target.value }))}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Joined To</label>
                                <input
                                    type="date"
                                    value={filters.joinTo}
                                    onChange={(e) => setFilters((f) => ({ ...f, joinTo: e.target.value }))}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setFilters({ category: "", feeStatus: "", mode: "", joinFrom: "", joinTo: "" })}
                                className="flex-1 rounded-2xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                            >
                                Clear
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilterOpen(false)}
                                className="flex-1 rounded-2xl bg-[#FF6B35] py-2.5 text-sm font-semibold text-white transition hover:bg-[#fd5a1f]"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {view === "cards" ? (
                <DataCards
                    {...sharedListProps}
                    renderCard={(row, { selected, onSelect }) => (
                        <PersonCard
                            avatarSrc={row.avatar || undefined}
                            name={row.name}
                            subtitle={row.courses[0]?.name || "No course"}
                            statusBadge={cardStatusBadge(row)}
                            meta={[
                                { label: "Student ID", value: row.mockId },
                                { label: "Course Code", value: row.courses[0]?.code || "N/A" },
                                { label: "Progress", value: row.avgProgress != null ? `${row.avgProgress}%` : "N/A" },
                                { label: "Mode", value: row.mode, render: modeBadge },
                            ]}
                            onView={() => handleRowClick(row.raw)}
                            primaryLabel="View Student"
                            menuItems={buildMenuItems(row)}
                            selected={selected}
                            onSelect={onSelect}
                        />
                    )}
                />
            ) : (
                <DataTable
                    {...sharedListProps}
                    columns={tableColumns}
                    onRowClick={(row) => handleRowClick(row.raw)}
                />
            )}
        </>
    );
};

export default EnrolledStudents;
