import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { FaSearch, FaFilter, FaSortAmountDown } from "react-icons/fa";
import { X } from "react-feather";
import { getAllBookings, updateBookingStatus } from "../../../../redux/DemoBooking/DemoBookingSlice";
import DataCards from "../../../../components/DataCards";
import PersonCard from "../../../../components/cards/PersonCard";

const SORT_OPTIONS = [
    { value: "name-asc", label: "Name A-Z" },
    { value: "name-desc", label: "Name Z-A" },
    { value: "demoStatus-asc", label: "Demo Status Asc" },
    { value: "demoStatus-desc", label: "Demo Status Desc" },
];

const DEMO_STATUS_OPTIONS = ["Booked", "Attended", "Missed", "Rescheduled"];
const ENROLLMENT_STATUS_OPTIONS = ["Not Enrolled", "Enrolled"];
const FOLLOW_UP_OPTIONS = ["Pending", "Contacted", "Closed"];

const demoStatusClasses = {
    Booked: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
    Attended: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    Missed: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    Rescheduled: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
};

const getBookingStudentMeta = (booking) => {
    const guest = booking?.lead || {};
    const studentUser = booking?.studentId?.userId || {};
    const firstName = guest?.firstName || studentUser?.name?.firstName || "";
    const lastName = guest?.lastName || studentUser?.name?.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim();
    return {
        name: fullName || guest?.email || studentUser?.email || "Guest student",
        email: guest?.email || studentUser?.email || "No Email",
        phone: guest?.phone || studentUser?.mobileNo || "No Phone",
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

const DemoStudents = () => {
    const dispatch = useDispatch();
    const { bookings, loading, error } = useSelector((state) => state.demoBookings);

    const [searchTerm, setSearchTerm] = useState("");
    const [sortOpen, setSortOpen] = useState(false);
    const [sortOption, setSortOption] = useState("");
    const [filterOpen, setFilterOpen] = useState(false);
    const [filters, setFilters] = useState({ demoStatus: "", enrollmentStatus: "", followUp: "" });
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
        try {
            await dispatch(updateBookingStatus({ id, updatedData: { [key]: value } }));
            toast.success("Updated successfully!");
            dispatch(getAllBookings());
        } catch {
            toast.error("Update failed!");
        }
    };

    const clearFilters = () => setFilters({ demoStatus: "", enrollmentStatus: "", followUp: "" });

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

    if (sortOption) {
        switch (sortOption) {
            case "name-asc": filteredStudents.sort((a, b) => getBookingStudentMeta(a).name.localeCompare(getBookingStudentMeta(b).name)); break;
            case "name-desc": filteredStudents.sort((a, b) => getBookingStudentMeta(b).name.localeCompare(getBookingStudentMeta(a).name)); break;
            case "demoStatus-asc": filteredStudents.sort((a, b) => (a.demoStatus || "").localeCompare(b.demoStatus || "")); break;
            case "demoStatus-desc": filteredStudents.sort((a, b) => (b.demoStatus || "").localeCompare(a.demoStatus || "")); break;
        }
    }

    const handleCopyDetails = (selectedRows) => {
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
        navigator.clipboard.writeText(details).then(() => toast.success("Copied to clipboard!"));
    };

    const activeFilterCount = Object.values(filters).filter(Boolean).length;

    return (
        <div>
            <div className="mb-4 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                Demo bookings are automatically assigned to the instructor whose slot the learner selected.
            </div>

            {/* Toolbar */}
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:w-80">
                    <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                    <input
                        type="text"
                        placeholder="Search by learner, email, course, or instructor…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative" ref={dropdownRef}>
                        <button
                            type="button"
                            onClick={() => setSortOpen(!sortOpen)}
                            className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${
                                sortOption
                                    ? "border-orange-300 bg-orange-50 text-orange-700"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                        >
                            <FaSortAmountDown size={13} /> Sort
                        </button>
                        {sortOpen && (
                            <div className="absolute right-0 z-40 mt-2 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                                {SORT_OPTIONS.map(({ value, label }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => { setSortOption(value); setSortOpen(false); }}
                                        className={`flex w-full items-center px-4 py-2.5 text-left text-sm transition hover:bg-slate-50 ${
                                            sortOption === value ? "bg-orange-50 font-semibold text-orange-700" : "text-slate-700"
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
                                ? "border-orange-300 bg-orange-50 text-orange-700"
                                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
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
                </div>
            </div>

            {/* Filter modal */}
            {filterOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
                    <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
                        <button
                            type="button"
                            onClick={() => setFilterOpen(false)}
                            className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        >
                            <X size={18} />
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
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button
                                type="button"
                                onClick={clearFilters}
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

            <DataCards
                data={filteredStudents}
                itemsPerPage={12}
                emptyMessage="No demo requests found."
                onCopyDetails={handleCopyDetails}
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
                            selected={selected}
                            onSelect={onSelect}
                        >
                            {/* Inline status dropdowns */}
                            <div className="space-y-2 pb-1">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Demo Status</p>
                                        <select
                                            value={row.demoStatus || ""}
                                            onChange={(e) => updateStudent(row._id, "demoStatus", e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none transition focus:border-orange-400 focus:ring-1 focus:ring-orange-200"
                                        >
                                            {DEMO_STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Enrollment</p>
                                        <select
                                            value={row.enrollmentStatus || ""}
                                            onChange={(e) => updateStudent(row._id, "enrollmentStatus", e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none transition focus:border-orange-400 focus:ring-1 focus:ring-orange-200"
                                        >
                                            {ENROLLMENT_STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Follow Up</p>
                                    <select
                                        value={row.followUp || ""}
                                        onChange={(e) => updateStudent(row._id, "followUp", e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none transition focus:border-orange-400 focus:ring-1 focus:ring-orange-200"
                                    >
                                        {FOLLOW_UP_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Response</p>
                                    <input
                                        type="text"
                                        value={row.response || ""}
                                        onChange={(e) => updateStudent(row._id, "response", e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        placeholder="Enter response…"
                                        className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none transition focus:border-orange-400 focus:ring-1 focus:ring-orange-200"
                                    />
                                </div>
                            </div>
                        </PersonCard>
                    );
                }}
            />
        </div>
    );
};

export default DemoStudents;
