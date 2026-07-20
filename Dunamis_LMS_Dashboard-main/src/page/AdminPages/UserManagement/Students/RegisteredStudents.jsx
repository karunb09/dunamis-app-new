import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useQueryClient } from "@tanstack/react-query";
import { updateUser } from "../../../../redux/User/UserSlice";
import toast from "react-hot-toast";
import { FaArchive, FaBan, FaClipboard, FaEnvelope, FaFilter, FaFlag, FaList, FaPhone, FaSearch, FaSortAmountDown, FaTh, FaUserSlash } from "react-icons/fa";
import { FiX } from "react-icons/fi";
import Swal from "sweetalert2";
import dayjs from "dayjs";
import { getStoredToken } from "../../../../utils/authSession";
import ActionProgressBar from "../../../../components/ActionProgressBar";
import SavingOverlay from "../../../../components/SavingOverlay";
import DataCards from "../../../../components/DataCards";
import DataTable from "../../../../components/Table";
import PersonCard from "../../../../components/cards/PersonCard";
import RowActionsMenu from "../../../../components/RowActionsMenu";
import ExportMenu from "../../../../components/ExportMenu";
import { resolveImageUrl } from "../../../../utils/resolveImageUrl";
import { useStudentsByType, useUpdateStudent, studentKeys } from "../../../../hooks/useStudents";
import usePersistedState from "../../../../hooks/usePersistedState";
import { exportToExcel } from "../../../../utils/exportToExcel";

const SORT_OPTIONS = [
    { value: "name-asc", label: "Name A-Z" },
    { value: "name-desc", label: "Name Z-A" },
    { value: "date-asc", label: "Registration Date Asc" },
    { value: "date-desc", label: "Registration Date Desc" },
];

const FOLLOW_UP_KEYS = ["followUp1", "followUp2", "followUp3"];
const FOLLOW_UP_OPTIONS = [
    { value: "pending", label: "Pending" },
    { value: "contacted", label: "Contacted" },
    { value: "completed", label: "Completed" },
];
const FOLLOW_UP_LABELS = { pending: "Pending", contacted: "Contacted", completed: "Completed" };
const PAGE_SIZE_OPTIONS = [12, 24, 48, 96];

const normFollowUp = (value) => (value === "complete" ? "completed" : value || "pending");
const formatDate = (date) => (date ? dayjs(date).format("DD MMM YYYY") : "—");

const FollowUpSelect = ({ value, locked, saving, onChange }) => (
    <select
        value={value}
        disabled={locked || saving}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        className={`w-full rounded-xl border px-2 py-2 text-xs font-medium transition-colors focus:outline-none ${
            locked
                ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400"
                : "border-slate-200 bg-white text-slate-700 focus:border-orange-400"
        }`}
    >
        {FOLLOW_UP_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
        ))}
    </select>
);

const ResponseInput = ({ value, saving, onCommit }) => {
    const [draft, setDraft] = useState(value ?? "");

    useEffect(() => {
        setDraft(value ?? "");
    }, [value]);

    const commit = () => {
        if ((draft ?? "").trim() !== (value ?? "").trim()) onCommit(draft.trim());
    };

    return (
        <input
            type="text"
            value={draft}
            disabled={saving}
            placeholder="Add a note…"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 transition-colors placeholder:text-slate-300 focus:border-orange-400 focus:outline-none disabled:opacity-50"
        />
    );
};

const RegisteredStudents = () => {
    const dispatch = useDispatch();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const { data: studentsByType, isLoading, error } = useStudentsByType();
    const updateMutation = useUpdateStudent();
    const authToken = useSelector((state) => state.auth.token);
    const token = authToken || getStoredToken();

    const [view, setView] = usePersistedState("registeredStudentsView", "cards");
    const [pageSize, setPageSize] = usePersistedState("registeredStudentsPageSize", 12);
    const [selectedIds, setSelectedIds] = useState([]);
    const [exporting, setExporting] = useState(false);
    const [sortOpen, setSortOpen] = useState(false);
    const [sortOption, setSortOption] = useState("");
    const [filterOpen, setFilterOpen] = useState(false);
    const [filters, setFilters] = useState({ status: "", followUp: "", dateFrom: "", dateTo: "" });
    const [processingAction, setProcessingAction] = useState(null);
    const sortRef = useRef(null);

    const getErrorMessage = (err, fallback) => {
        if (typeof err === "string") return err;
        return err?.message || err?.error || err?.data?.message || fallback;
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    let students = (studentsByType?.registered || []).map((s, index) => ({
        _id: s._id,
        userDocId: s.userId?._id,
        studentId: `#STU-${index + 1000}`,
        name: `${s.userId?.name?.firstName || ""} ${s.userId?.name?.lastName || ""}`.trim() || "—",
        email: s.userId?.email || "",
        phone: s.userId?.mobileNo != null ? String(s.userId.mobileNo) : "",
        avatar: resolveImageUrl(s.userId?.image, "/profile-photo.png"),
        registeredAt: s.userId?.createdAt ? new Date(s.userId.createdAt) : null,
        accountStatus: (s.userId?.accountStatus || "active").toLowerCase(),
        followUps: {
            followUp1: normFollowUp(s.followUps?.followUp1),
            followUp2: normFollowUp(s.followUps?.followUp2),
            followUp3: normFollowUp(s.followUps?.followUp3),
        },
        response: s.followUps?.response || "",
    }));

    if (filters.status) {
        const wanted = filters.status === "Active" ? "active" : "inactive";
        students = students.filter((s) => s.accountStatus === wanted);
    }
    if (filters.followUp) {
        students = students.filter((s) =>
            FOLLOW_UP_KEYS.some((key) => s.followUps[key] === filters.followUp)
        );
    }
    if (filters.dateFrom) {
        const from = new Date(filters.dateFrom);
        students = students.filter((s) => s.registeredAt && s.registeredAt >= from);
    }
    if (filters.dateTo) {
        const to = new Date(`${filters.dateTo}T23:59:59`);
        students = students.filter((s) => s.registeredAt && s.registeredAt <= to);
    }

    const query = searchTerm.trim().toLowerCase();
    const filteredStudents = query
        ? students.filter((s) =>
              [s.name, s.email, s.phone].some((v) => v.toLowerCase().includes(query))
          )
        : students;

    if (sortOption) {
        switch (sortOption) {
            case "name-asc": filteredStudents.sort((a, b) => a.name.localeCompare(b.name)); break;
            case "name-desc": filteredStudents.sort((a, b) => b.name.localeCompare(a.name)); break;
            case "date-asc": filteredStudents.sort((a, b) => (a.registeredAt || 0) - (b.registeredAt || 0)); break;
            case "date-desc": filteredStudents.sort((a, b) => (b.registeredAt || 0) - (a.registeredAt || 0)); break;
        }
    }

    const rowSaving = (row) =>
        updateMutation.isPending && updateMutation.variables?.id === row._id;

    const saveFollowUp = (row, key, value) =>
        updateMutation.mutate({ id: row._id, payload: { followUps: { [key]: value } } });

    const saveResponse = (row, value) =>
        updateMutation.mutate({ id: row._id, payload: { followUps: { response: value } } });

    const copyText = (text, successMsg) =>
        navigator.clipboard.writeText(text)
            .then(() => toast.success(successMsg))
            .catch(() => toast.error("Failed to copy!"));

    const handleCopyDetails = (rows) => {
        if (!rows.length) return toast.error("No student data to copy!");
        const details = rows
            .map(
                (s) => `Name: ${s.name}
Email: ${s.email}
Mobile: ${s.phone || "N/A"}
Registered: ${formatDate(s.registeredAt)}
Follow-up 1: ${FOLLOW_UP_LABELS[s.followUps.followUp1]}
Follow-up 2: ${FOLLOW_UP_LABELS[s.followUps.followUp2]}
Follow-up 3: ${FOLLOW_UP_LABELS[s.followUps.followUp3]}
Response: ${s.response || "—"}
Status: ${s.accountStatus === "active" ? "Active" : "Inactive"}`
            )
            .join("\n\n---\n\n");
        copyText(details, "Student details copied to clipboard!");
    };

    const EXPORT_COLUMNS = [
        { header: "Name", value: (r) => r.name, width: 24 },
        { header: "Email", value: (r) => r.email, width: 30 },
        { header: "Phone", value: (r) => r.phone, width: 16 },
        { header: "Registered", value: (r) => formatDate(r.registeredAt), width: 14 },
        { header: "Follow-up 1", value: (r) => FOLLOW_UP_LABELS[r.followUps.followUp1] },
        { header: "Follow-up 2", value: (r) => FOLLOW_UP_LABELS[r.followUps.followUp2] },
        { header: "Follow-up 3", value: (r) => FOLLOW_UP_LABELS[r.followUps.followUp3] },
        { header: "Response", value: (r) => r.response, width: 32 },
        { header: "Status", value: (r) => (r.accountStatus === "active" ? "Active" : "Inactive") },
    ];

    const runExport = async (rows) => {
        if (!rows.length) return toast.error("Nothing to export");
        setExporting(true);
        try {
            await exportToExcel({
                fileName: `registered-students-${dayjs().format("YYYY-MM-DD")}`,
                sheetName: "Registered Students",
                columns: EXPORT_COLUMNS,
                rows,
            });
            toast.success(`Exported ${rows.length} student${rows.length === 1 ? "" : "s"}`);
        } catch {
            toast.error("Export failed");
        } finally {
            setExporting(false);
        }
    };

    const handleStudentAction = async (row, actionLabel) => {
        const actionKey = `${row._id}-${actionLabel.toLowerCase()}`;
        setProcessingAction({
            key: actionKey,
            label: `${actionLabel} request for ${row.name} is being processed...`,
        });
        const toastId = toast.loading(`${actionLabel} request started for ${row.name}`);

        try {
            if (actionLabel === "Disable") {
                const nextStatus = row.accountStatus === "active" ? "inactive" : "active";
                await dispatch(updateUser({
                    id: row.userDocId,
                    userData: { accountStatus: nextStatus },
                    token,
                })).unwrap();
                queryClient.invalidateQueries({ queryKey: studentKeys.all });
                toast.dismiss(toastId);
                await Swal.fire({
                    icon: "success",
                    title: "Student status updated",
                    text: `${row.name} is now ${nextStatus === "active" ? "enabled" : "disabled"}.`,
                    confirmButtonColor: "#0f172a",
                });
                return;
            }
            await new Promise((resolve) => setTimeout(resolve, 900));
            toast.dismiss(toastId);
            await Swal.fire({
                icon: "info",
                title: `${actionLabel} not available yet`,
                text: `${actionLabel} for ${row.name} is not connected to the backend yet.`,
                confirmButtonColor: "#0f172a",
            });
        } catch (err) {
            toast.dismiss(toastId);
            await Swal.fire({
                icon: "error",
                title: "Action failed",
                text: getErrorMessage(err, `We could not process ${actionLabel.toLowerCase()} for ${row.name}.`),
                confirmButtonColor: "#dc2626",
            });
        } finally {
            setProcessingAction(null);
        }
    };

    const buildMenuItems = (row) => [
        {
            label: "Copy Email",
            icon: <FaEnvelope size={13} />,
            disabled: !row.email,
            onClick: () => copyText(row.email, "Email copied!"),
        },
        {
            label: "Copy Phone",
            icon: <FaPhone size={13} />,
            disabled: !row.phone,
            onClick: () => copyText(row.phone, "Phone number copied!"),
        },
        {
            label: "Copy All Details",
            icon: <FaClipboard size={13} />,
            onClick: () => handleCopyDetails([row]),
        },
        {
            label: row.accountStatus === "active" ? "Disable" : "Enable",
            icon: <FaUserSlash size={13} />,
            disabled: Boolean(processingAction),
            onClick: () => handleStudentAction(row, "Disable"),
        },
        {
            label: "Block",
            icon: <FaBan size={13} />,
            disabled: Boolean(processingAction),
            onClick: () => handleStudentAction(row, "Block"),
        },
        {
            label: "Archive",
            icon: <FaArchive size={13} />,
            disabled: Boolean(processingAction),
            onClick: () => handleStudentAction(row, "Archive"),
        },
        {
            label: "Report",
            icon: <FaFlag size={13} />,
            disabled: Boolean(processingAction),
            onClick: () => handleStudentAction(row, "Report"),
        },
    ];

    const statusBadge = (row) =>
        row.accountStatus === "active"
            ? { label: "Active", className: "bg-emerald-50 text-emerald-600", dot: true, dotClass: "bg-emerald-500" }
            : { label: "Inactive", className: "bg-rose-50 text-rose-600", dot: true, dotClass: "bg-rose-500" };

    const renderFollowUpBlock = (row) => (
        <div onClick={(e) => e.stopPropagation()} className="border-t border-slate-100 pt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Follow-ups</p>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
                {FOLLOW_UP_KEYS.map((key, i) => (
                    <div key={key}>
                        <p className="mb-1 text-[10px] text-slate-400">{["1st", "2nd", "3rd"][i]}</p>
                        <FollowUpSelect
                            value={row.followUps[key]}
                            locked={row.followUps[key] === "completed"}
                            saving={rowSaving(row)}
                            onChange={(value) => saveFollowUp(row, key, value)}
                        />
                    </div>
                ))}
            </div>
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Response</p>
            <div className="mt-1.5">
                <ResponseInput
                    value={row.response}
                    saving={rowSaving(row)}
                    onCommit={(value) => saveResponse(row, value)}
                />
            </div>
        </div>
    );

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
            key: "phone",
            header: "Phone",
            minWidth: "130px",
            nowrap: true,
            render: (_, row) => row.phone || "—",
        },
        {
            key: "registeredAt",
            header: "Registered",
            minWidth: "120px",
            nowrap: true,
            render: (_, row) => formatDate(row.registeredAt),
        },
        ...FOLLOW_UP_KEYS.map((key, i) => ({
            key,
            header: `Follow-up ${i + 1}`,
            minWidth: "130px",
            render: (_, row) => (
                <FollowUpSelect
                    value={row.followUps[key]}
                    locked={row.followUps[key] === "completed"}
                    saving={rowSaving(row)}
                    onChange={(value) => saveFollowUp(row, key, value)}
                />
            ),
        })),
        {
            key: "response",
            header: "Response",
            minWidth: "200px",
            render: (_, row) => (
                <ResponseInput
                    value={row.response}
                    saving={rowSaving(row)}
                    onCommit={(value) => saveResponse(row, value)}
                />
            ),
        },
        {
            key: "status",
            header: "Status",
            minWidth: "100px",
            nowrap: true,
            render: (_, row) => {
                const badge = statusBadge(row);
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

    const selectedRows = filteredStudents.filter((r) => selectedIds.includes(r._id));

    const sharedListProps = {
        data: filteredStudents,
        itemsPerPage: pageSize,
        itemsPerPageOptions: PAGE_SIZE_OPTIONS,
        onItemsPerPageChange: setPageSize,
        onSelectionChange: setSelectedIds,
        emptyMessage: "No registered students found.",
        onCopyDetails: handleCopyDetails,
    };

    return (
        <div>
            {isLoading && <p className="mb-4 text-sm text-slate-500">Loading students…</p>}
            {error && <p className="mb-4 text-sm text-rose-500">Error: {error.message}</p>}
            <ActionProgressBar active={Boolean(processingAction)} label={processingAction?.label} />
            <SavingOverlay show={updateMutation.isPending || Boolean(processingAction?.key?.endsWith("-disable"))} />

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
                                            sortOption === value ? "bg-orange-50 font-semibold text-orange-600" : "text-slate-700"
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
                            activeFilterCount(filters)
                                ? "border-orange-200 bg-orange-50 text-orange-600"
                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                    >
                        <FaFilter size={13} />
                        Filter
                        {activeFilterCount(filters) > 0 && (
                            <span className="rounded-full bg-[#FF6B35] px-2 py-0.5 text-xs font-semibold text-white">
                                {activeFilterCount(filters)}
                            </span>
                        )}
                    </button>
                    <ExportMenu
                        onExportAll={() => runExport(filteredStudents)}
                        onExportSelected={() => runExport(selectedRows)}
                        totalCount={filteredStudents.length}
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
                        <h2 className="mt-1 text-lg font-bold text-slate-900">Filter Students</h2>

                        <div className="mt-5 space-y-4">
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Status</label>
                                <select
                                    value={filters.status || ""}
                                    onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                >
                                    <option value="">All</option>
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Follow-up</label>
                                <select
                                    value={filters.followUp || ""}
                                    onChange={(e) => setFilters((f) => ({ ...f, followUp: e.target.value }))}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                >
                                    <option value="">All</option>
                                    {FOLLOW_UP_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Registration From</label>
                                <input
                                    type="date"
                                    value={filters.dateFrom || ""}
                                    onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Registration To</label>
                                <input
                                    type="date"
                                    value={filters.dateTo || ""}
                                    onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setFilters({ status: "", followUp: "", dateFrom: "", dateTo: "" })}
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
                            subtitle={row.email}
                            statusBadge={statusBadge(row)}
                            meta={[
                                { label: "Student ID", value: row.studentId },
                                { label: "Mobile", value: row.phone || "N/A" },
                                { label: "Registered", value: formatDate(row.registeredAt) },
                            ]}
                            onView={() => handleCopyDetails([row])}
                            primaryLabel="Copy Details"
                            menuItems={buildMenuItems(row)}
                            selected={selected}
                            onSelect={onSelect}
                        >
                            {renderFollowUpBlock(row)}
                        </PersonCard>
                    )}
                />
            ) : (
                <DataTable {...sharedListProps} columns={tableColumns} />
            )}
        </div>
    );
};

const activeFilterCount = (filters) => Object.values(filters).filter(Boolean).length;

export default RegisteredStudents;
