import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { FaSearch, FaFilter, FaList, FaSortAmountDown, FaTh } from "react-icons/fa";
import { FiClipboard, FiX } from "react-icons/fi";
import dayjs from "dayjs";
import { getAllBookings, updateBookingStatus } from "../../../../redux/DemoBooking/DemoBookingSlice";
import DataCards from "../../../../components/DataCards";
import DataTable from "../../../../components/Table";
import PersonCard from "../../../../components/cards/PersonCard";
import RowActionsMenu from "../../../../components/RowActionsMenu";
import ExportMenu from "../../../../components/ExportMenu";
import SavingOverlay from "../../../../components/SavingOverlay";
import usePersistedState from "../../../../hooks/usePersistedState";
import { exportToExcel } from "../../../../utils/exportToExcel";

const SORT_OPTIONS = [
    { value: "name-asc", label: "Name A-Z" },
    { value: "name-desc", label: "Name Z-A" },
    { value: "demoStatus-asc", label: "Demo Status Asc" },
    { value: "demoStatus-desc", label: "Demo Status Desc" },
];

const DEMO_STATUS_OPTIONS = ["Booked", "Attended", "Missed", "Rescheduled"];
const ENROLLMENT_STATUS_OPTIONS = ["Not Enrolled", "Enrolled"];
const FOLLOW_UP_OPTIONS = ["Pending", "Contacted", "Closed"];
const PAGE_SIZE_OPTIONS = [12, 24, 48, 96];

const demoStatusClasses = {
    Booked: "bg-sky-50 text-sky-600",
    Attended: "bg-emerald-50 text-emerald-600",
    Missed: "bg-rose-50 text-rose-600",
    Rescheduled: "bg-amber-50 text-amber-600",
    Cancelled: "bg-slate-100 text-slate-500",
};

const getBookingStudentMeta = (booking) => {
    const guest = booking?.lead || {};
    const studentUser = booking?.studentId?.userId || {};
    const firstName = guest?.firstName || studentUser?.name?.firstName || "";
    const lastName = guest?.lastName || studentUser?.name?.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim();
    const phone = guest?.phone || (studentUser?.mobileNo != null ? String(studentUser.mobileNo) : "");
    return {
        name: fullName || guest?.email || studentUser?.email || "Guest student",
        email: guest?.email || studentUser?.email || "No Email",
        phone: phone || "No Phone",
        image: studentUser?.image || "https://api.dicebear.com/9.x/initials/svg?seed=Guest",
    };
};

const getBookingCourse = (booking) =>
    booking?.courseId || booking?.slotId?.courseId || booking?.studentId?.enrolledCourses?.[0]?.courseId || null;

const getBookingTeacherName = (booking) => {
    const teacherUser = booking?.teacherId?.userId || {};
    const firstName = teacherUser?.name?.firstName || "";
    const lastName = teacherUser?.name?.lastName || "";
    return `${firstName} ${lastName}`.trim() || teacherUser?.email || "Not assigned";
};

const getBookingMode = (booking) =>
    booking?.deliveryMode || getBookingCourse(booking)?.mode || booking?.studentId?.mode || "N/A";

const getBookingSlotLabel = (booking) => {
    if (!booking?.slotId) return "N/A";
    const date = booking.slotId?.date ? new Date(booking.slotId.date) : null;
    const dateLabel = date && !Number.isNaN(date.getTime())
        ? date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
        : "Date TBD";
    return `${dateLabel} • ${booking.slotId.startTime || "?"} - ${booking.slotId.endTime || "?"}`;
};

const getBookingDate = (booking) => {
    const d = booking?.slotId?.date || booking?.createdAt;
    return d ? new Date(d) : null;
};

const BookingSelect = ({ value, options, saving, onChange }) => (
    <select
        value={value || ""}
        disabled={saving}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none transition-colors focus:border-orange-400 disabled:opacity-50"
    >
        {options.map((o) => (
            <option key={o} value={o}>{o}</option>
        ))}
    </select>
);

const BookingResponseInput = ({ value, saving, onCommit }) => {
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
            placeholder="Enter response…"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none transition-colors placeholder:text-slate-300 focus:border-orange-400 disabled:opacity-50"
        />
    );
};

const DemoStudents = () => {
    const dispatch = useDispatch();
    const { bookings, loading, error } = useSelector((state) => state.demoBookings);

    const [searchTerm, setSearchTerm] = useState("");
    const [sortOpen, setSortOpen] = useState(false);
    const [sortOption, setSortOption] = useState("");
    const [filterOpen, setFilterOpen] = useState(false);
    const [filters, setFilters] = useState({ demoStatus: "", enrollmentStatus: "", followUp: "", mode: "", bookedFrom: "", bookedTo: "" });
    const [view, setView] = usePersistedState("demoStudentsView", "cards");
    const [pageSize, setPageSize] = usePersistedState("demoStudentsPageSize", 12);
    const [selectedIds, setSelectedIds] = useState([]);
    const [exporting, setExporting] = useState(false);
    const [savingId, setSavingId] = useState(null);
    const dropdownRef = useRef(null);

    useEffect(() => {
        dispatch(getAllBookings());
    }, [dispatch]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setSortOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const updateStudent = async (id, key, value) => {
        setSavingId(id);
        try {
            await dispatch(updateBookingStatus({ id, updatedData: { [key]: value } })).unwrap();
            toast.success("Updated successfully!");
            dispatch(getAllBookings());
        } catch (err) {
            toast.error(typeof err === "string" ? err : err?.message || "Update failed!");
        } finally {
            setSavingId(null);
        }
    };

    const studentsWithMockId = Array.isArray(bookings)
        ? bookings.map((row, index) => ({ ...row, mockId: `#DEMO-${1000 + index}` }))
        : [];

    let filteredStudents = studentsWithMockId;

    if (searchTerm) {
        filteredStudents = filteredStudents.filter((row) => {
            const student = getBookingStudentMeta(row);
            const course = getBookingCourse(row);
            const haystack = [student.name, student.email, student.phone, course?.name, course?.code, getBookingTeacherName(row)]
                .filter(Boolean).join(" ").toLowerCase();
            return haystack.includes(searchTerm.toLowerCase());
        });
    }

    if (filters.demoStatus) filteredStudents = filteredStudents.filter((s) => s.demoStatus === filters.demoStatus);
    if (filters.enrollmentStatus) filteredStudents = filteredStudents.filter((s) => s.enrollmentStatus === filters.enrollmentStatus);
    if (filters.followUp) filteredStudents = filteredStudents.filter((s) => s.followUp === filters.followUp);
    if (filters.mode) filteredStudents = filteredStudents.filter((s) => getBookingMode(s) === filters.mode);
    if (filters.bookedFrom) {
        const from = new Date(filters.bookedFrom);
        filteredStudents = filteredStudents.filter((s) => {
            const d = getBookingDate(s);
            return d && d >= from;
        });
    }
    if (filters.bookedTo) {
        const to = new Date(`${filters.bookedTo}T23:59:59`);
        filteredStudents = filteredStudents.filter((s) => {
            const d = getBookingDate(s);
            return d && d <= to;
        });
    }

    if (sortOption) {
        filteredStudents = [...filteredStudents];
        switch (sortOption) {
            case "name-asc": filteredStudents.sort((a, b) => getBookingStudentMeta(a).name.localeCompare(getBookingStudentMeta(b).name)); break;
            case "name-desc": filteredStudents.sort((a, b) => getBookingStudentMeta(b).name.localeCompare(getBookingStudentMeta(a).name)); break;
            case "demoStatus-asc": filteredStudents.sort((a, b) => (a.demoStatus || "").localeCompare(b.demoStatus || "")); break;
            case "demoStatus-desc": filteredStudents.sort((a, b) => (b.demoStatus || "").localeCompare(a.demoStatus || "")); break;
        }
    }

    const handleCopyDetails = (selectedRows) => {
        if (!selectedRows.length) return toast.error("No booking data to copy!");
        const details = selectedRows.map((s) => {
            const student = getBookingStudentMeta(s);
            const course = getBookingCourse(s);
            return `Student ID: ${s.mockId || "N/A"}
Name: ${student.name}
Email: ${student.email}
Phone: ${student.phone}
Course: ${course?.name || "N/A"}
Assigned Instructor: ${getBookingTeacherName(s)}
Mode: ${getBookingMode(s)}
Demo Status: ${s.demoStatus || "N/A"}
Enrollment Status: ${s.enrollmentStatus || "N/A"}
Follow Up: ${s.followUp || "N/A"}
Response: ${s.response || "N/A"}
Slot: ${getBookingSlotLabel(s)}`.trim();
        }).join("\n\n---\n\n");
        navigator.clipboard.writeText(details)
            .then(() => toast.success("Copied to clipboard!"))
            .catch(() => toast.error("Failed to copy!"));
    };

    const EXPORT_COLUMNS = [
        { header: "Name", value: (r) => getBookingStudentMeta(r).name, width: 24 },
        { header: "Email", value: (r) => getBookingStudentMeta(r).email, width: 30 },
        { header: "Phone", value: (r) => getBookingStudentMeta(r).phone, width: 16 },
        { header: "Course", value: (r) => getBookingCourse(r)?.name || "", width: 24 },
        { header: "Instructor", value: (r) => getBookingTeacherName(r), width: 20 },
        { header: "Slot Date", value: (r) => (r.slotId?.date ? dayjs(r.slotId.date).format("DD MMM YYYY") : ""), width: 14 },
        { header: "Slot Time", value: (r) => (r.slotId ? `${r.slotId.startTime || "?"} - ${r.slotId.endTime || "?"}` : ""), width: 16 },
        { header: "Mode", value: (r) => getBookingMode(r) },
        { header: "Demo Status", value: (r) => r.demoStatus || "" },
        { header: "Enrollment Status", value: (r) => r.enrollmentStatus || "", width: 16 },
        { header: "Follow Up", value: (r) => r.followUp || "" },
        { header: "Response", value: (r) => r.response || "", width: 32 },
    ];

    const runExport = async (list) => {
        if (!list.length) return toast.error("Nothing to export");
        setExporting(true);
        try {
            await exportToExcel({
                fileName: `demo-students-${dayjs().format("YYYY-MM-DD")}`,
                sheetName: "Demo Students",
                columns: EXPORT_COLUMNS,
                rows: list,
            });
            toast.success(`Exported ${list.length} booking${list.length === 1 ? "" : "s"}`);
        } catch {
            toast.error("Export failed");
        } finally {
            setExporting(false);
        }
    };

    const buildMenuItems = (row) => [
        {
            label: "Copy Details",
            icon: <FiClipboard size={14} />,
            onClick: () => handleCopyDetails([row]),
        },
    ];

    const tableColumns = [
        {
            key: "learner",
            header: "Learner",
            minWidth: "200px",
            render: (_, row) => {
                const student = getBookingStudentMeta(row);
                return (
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{student.name}</p>
                        <p className="truncate text-xs text-slate-500">{student.email}</p>
                    </div>
                );
            },
        },
        {
            key: "phone",
            header: "Phone",
            minWidth: "120px",
            nowrap: true,
            render: (_, row) => getBookingStudentMeta(row).phone,
        },
        {
            key: "course",
            header: "Course",
            minWidth: "150px",
            render: (_, row) => getBookingCourse(row)?.name || "—",
        },
        {
            key: "instructor",
            header: "Instructor",
            minWidth: "150px",
            render: (_, row) => getBookingTeacherName(row),
        },
        {
            key: "slot",
            header: "Slot",
            minWidth: "160px",
            nowrap: true,
            render: (_, row) => getBookingSlotLabel(row),
        },
        {
            key: "mode",
            header: "Mode",
            minWidth: "90px",
            nowrap: true,
            render: (_, row) => <span className="capitalize">{getBookingMode(row)}</span>,
        },
        {
            key: "demoStatus",
            header: "Demo Status",
            minWidth: "130px",
            render: (_, row) => (
                <BookingSelect
                    value={row.demoStatus}
                    options={DEMO_STATUS_OPTIONS}
                    saving={savingId === row._id}
                    onChange={(value) => updateStudent(row._id, "demoStatus", value)}
                />
            ),
        },
        {
            key: "enrollmentStatus",
            header: "Enrollment",
            minWidth: "130px",
            render: (_, row) => (
                <BookingSelect
                    value={row.enrollmentStatus}
                    options={ENROLLMENT_STATUS_OPTIONS}
                    saving={savingId === row._id}
                    onChange={(value) => updateStudent(row._id, "enrollmentStatus", value)}
                />
            ),
        },
        {
            key: "followUp",
            header: "Follow Up",
            minWidth: "120px",
            render: (_, row) => (
                <BookingSelect
                    value={row.followUp}
                    options={FOLLOW_UP_OPTIONS}
                    saving={savingId === row._id}
                    onChange={(value) => updateStudent(row._id, "followUp", value)}
                />
            ),
        },
        {
            key: "response",
            header: "Response",
            minWidth: "180px",
            render: (_, row) => (
                <BookingResponseInput
                    value={row.response}
                    saving={savingId === row._id}
                    onCommit={(value) => updateStudent(row._id, "response", value)}
                />
            ),
        },
        {
            key: "actions",
            header: "",
            minWidth: "70px",
            render: (_, row) => <RowActionsMenu items={buildMenuItems(row)} />,
        },
    ];

    const activeFilterCount = Object.values(filters).filter(Boolean).length;
    const selectedRows = filteredStudents.filter((r) => selectedIds.includes(r._id));

    const sharedListProps = {
        data: filteredStudents,
        itemsPerPage: pageSize,
        itemsPerPageOptions: PAGE_SIZE_OPTIONS,
        onItemsPerPageChange: setPageSize,
        onSelectionChange: setSelectedIds,
        emptyMessage: "No demo requests found.",
        onCopyDetails: handleCopyDetails,
    };

    return (
        <div>
            {loading && <p className="mb-4 text-sm text-slate-500">Loading demo bookings…</p>}
            {error && <p className="mb-4 text-sm text-rose-500">Error: {typeof error === "string" ? error : error?.message}</p>}
            <SavingOverlay show={Boolean(savingId)} />

            <div className="mb-4 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                Demo bookings are automatically assigned to the instructor whose slot the learner selected.
            </div>

            {/* Toolbar */}
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full lg:w-80">
                    <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                    <input
                        type="text"
                        placeholder="Search by learner, email, course, or instructor…"
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
                    <div className="relative" ref={dropdownRef}>
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
                        <h2 className="mt-1 text-lg font-bold text-slate-900">Filter Demo Requests</h2>

                        <div className="mt-5 space-y-4">
                            {[
                                { label: "Demo Status", key: "demoStatus", options: DEMO_STATUS_OPTIONS },
                                { label: "Enrollment Status", key: "enrollmentStatus", options: ENROLLMENT_STATUS_OPTIONS },
                                { label: "Follow Up Status", key: "followUp", options: FOLLOW_UP_OPTIONS },
                            ].map(({ label, key, options }) => (
                                <div key={key}>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
                                    <select
                                        value={filters[key] || ""}
                                        onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                    >
                                        <option value="">All</option>
                                        {options.map((o) => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </div>
                            ))}
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Mode</label>
                                <select
                                    value={filters.mode}
                                    onChange={(e) => setFilters((f) => ({ ...f, mode: e.target.value }))}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                >
                                    <option value="">All</option>
                                    <option value="online">Online</option>
                                    <option value="offline">Offline</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Booked From</label>
                                <input
                                    type="date"
                                    value={filters.bookedFrom}
                                    onChange={(e) => setFilters((f) => ({ ...f, bookedFrom: e.target.value }))}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Booked To</label>
                                <input
                                    type="date"
                                    value={filters.bookedTo}
                                    onChange={(e) => setFilters((f) => ({ ...f, bookedTo: e.target.value }))}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setFilters({ demoStatus: "", enrollmentStatus: "", followUp: "", mode: "", bookedFrom: "", bookedTo: "" })}
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
                    renderCard={(row, { selected, onSelect }) => {
                        const student = getBookingStudentMeta(row);
                        const course = getBookingCourse(row);
                        const demoStatusBadge = demoStatusClasses[row.demoStatus];

                        return (
                            <PersonCard
                                avatarSrc={student.image || undefined}
                                name={student.name}
                                subtitle={student.email}
                                statusBadge={
                                    row.demoStatus
                                        ? { label: row.demoStatus, className: demoStatusBadge || "bg-slate-100 text-slate-600" }
                                        : undefined
                                }
                                meta={[
                                    { label: "Booking ID", value: row.mockId },
                                    { label: "Course", value: course?.name || "N/A" },
                                    { label: "Instructor", value: getBookingTeacherName(row) },
                                    { label: "Slot", value: getBookingSlotLabel(row) },
                                ]}
                                onView={() => handleCopyDetails([row])}
                                primaryLabel="Copy Details"
                                menuItems={buildMenuItems(row)}
                                selected={selected}
                                onSelect={onSelect}
                            >
                                <div onClick={(e) => e.stopPropagation()} className="space-y-2 border-t border-slate-100 pb-1 pt-3">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Status</p>
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        <div>
                                            <p className="mb-1 text-[10px] text-slate-400">Demo Status</p>
                                            <BookingSelect
                                                value={row.demoStatus}
                                                options={DEMO_STATUS_OPTIONS}
                                                saving={savingId === row._id}
                                                onChange={(value) => updateStudent(row._id, "demoStatus", value)}
                                            />
                                        </div>
                                        <div>
                                            <p className="mb-1 text-[10px] text-slate-400">Enrollment</p>
                                            <BookingSelect
                                                value={row.enrollmentStatus}
                                                options={ENROLLMENT_STATUS_OPTIONS}
                                                saving={savingId === row._id}
                                                onChange={(value) => updateStudent(row._id, "enrollmentStatus", value)}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="mb-1 text-[10px] text-slate-400">Follow Up</p>
                                        <BookingSelect
                                            value={row.followUp}
                                            options={FOLLOW_UP_OPTIONS}
                                            saving={savingId === row._id}
                                            onChange={(value) => updateStudent(row._id, "followUp", value)}
                                        />
                                    </div>
                                    <div>
                                        <p className="mb-1 text-[10px] text-slate-400">Response</p>
                                        <BookingResponseInput
                                            value={row.response}
                                            saving={savingId === row._id}
                                            onCommit={(value) => updateStudent(row._id, "response", value)}
                                        />
                                    </div>
                                </div>
                            </PersonCard>
                        );
                    }}
                />
            ) : (
                <DataTable {...sharedListProps} columns={tableColumns} />
            )}
        </div>
    );
};

export default DemoStudents;
