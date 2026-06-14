import React, { useEffect, useRef, useState } from "react";
import { FaFilter, FaSearch, FaSortAmountDown } from "react-icons/fa";
import { FiClipboard } from "react-icons/fi";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { FiX } from "react-icons/fi";
import { useStudentsByType } from "../../../../hooks/useStudents";
import DataCards from "../../../../components/DataCards";
import PersonCard from "../../../../components/cards/PersonCard";
import SlideOver from "../../../../components/SlideOver";

const EnrolledStudents = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState("");
    const [sortOpen, setSortOpen] = useState(false);
    const [sortOption, setSortOption] = useState("");
    const [filterOpen, setFilterOpen] = useState(false);
    const [filters, setFilters] = useState({ status: "", subcategory: "" });
    const [selectedCategory, setSelectedCategory] = useState("");
    const sortRef = useRef();
    const [slideOver, setSlideOver] = useState({ open: false, student: null });

    const { data: studentsByType } = useStudentsByType();

    const SORT_OPTIONS = [
        { value: "name", label: "Name" },
        { value: "courseName", label: "Course Name" },
        { value: "progress", label: "Progress" },
        { value: "feeStatus", label: "Fee Status" },
    ];

    const allCategories = ["Music", "Dance", "Language"];

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const enrolledStudents = studentsByType?.enrolled || [];

    const handleCopyDetails = (students) => {
        const studentArray = Array.isArray(students) ? students : [students];
        if (!studentArray.length) return toast.error("No student data to copy!");
        const details = studentArray
            .map((s) => {
                const courses = s.enrolledCourses?.map((c) => {
                    const course = c.courseId;
                    const paid = c.payments?.some((p) => p.PaymentStatus === "completed");
                    return `Course Name: ${course?.name || "N/A"}
Course Code: ${course?.code || "N/A"}
Progress: ${c.progress || "N/A"}
Mode: ${course?.mode || "N/A"}
Fee Status: ${paid ? "Paid" : "Pending"}`;
                }).join("\n---\n");
                return `Name: ${s.userId?.name?.firstName || "N/A"} ${s.userId?.name?.lastName || ""}
ID: ${s.studentId || "N/A"}
${courses || "No courses enrolled"}`;
            })
            .join("\n\n====================\n\n");
        navigator.clipboard.writeText(details).then(() => toast.success("Details copied!"));
    };

    const clearFilters = () => {
        setFilters({ status: "", subcategory: "" });
        setSelectedCategory("");
    };

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

    let displayedStudents = enrolledStudents;

    if (searchTerm) {
        displayedStudents = displayedStudents.filter((s) => {
            const fullName = `${s.userId?.name?.firstName || ""} ${s.userId?.name?.lastName || ""}`.toLowerCase();
            return fullName.includes(searchTerm.toLowerCase());
        });
    }

    if (filters.status)
        displayedStudents = displayedStudents.filter((s) =>
            s.enrolledCourses?.some(
                (c) =>
                    (filters.status === "Paid" && c.payments?.some((p) => p.PaymentStatus === "completed")) ||
                    (filters.status === "Pending" && !c.payments?.some((p) => p.PaymentStatus === "completed"))
            )
        );

    if (filters.subcategory)
        displayedStudents = displayedStudents.filter((s) =>
            s.enrolledCourses?.some((c) => c.courseId?.category === filters.subcategory)
        );

    if (sortOption) {
        displayedStudents = [...displayedStudents].sort((a, b) => {
            if (sortOption === "name") {
                const nameA = `${a.userId?.name?.firstName || ""} ${a.userId?.name?.lastName || ""}`;
                const nameB = `${b.userId?.name?.firstName || ""} ${b.userId?.name?.lastName || ""}`;
                return nameA.localeCompare(nameB);
            }
            return 0;
        });
    }

    const displayedStudentsWithId = displayedStudents.map((student, index) => ({
        ...student,
        mockId: `#ERD-${1000 + index}`,
    }));

    const closeSlideOver = () => setSlideOver((prev) => ({ ...prev, open: false }));

    const renderStudentSlide = () => {
        const s = slideOver.student;
        if (!s) return null;

        const firstName = s.userId?.name?.firstName || "";
        const lastName = s.userId?.name?.lastName || "";
        const fullName = `${firstName} ${lastName}`.trim() || "Unknown";
        const email = s.userId?.email || "—";
        const phone = s.userId?.mobileNo;
        const avatar = s.userId?.image;
        const courses = s.enrolledCourses || [];
        const paidCount = courses.filter((c) => c.payments?.some((p) => p.PaymentStatus === "completed")).length;
        const avgProgress =
            courses.length > 0
                ? Math.round(courses.reduce((sum, c) => sum + (c.progress || 0), 0) / courses.length)
                : 0;

        return (
            <>
                <div className="bg-gradient-to-b from-orange-50 to-white px-6 pb-6 pt-14">
                    <div className="flex items-start gap-4">
                        {avatar ? (
                            <img
                                src={avatar}
                                alt={fullName}
                                className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-4 ring-white shadow-md"
                                onError={(e) => { e.currentTarget.style.display = "none"; }}
                            />
                        ) : (
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFD9C7] to-[#FFF1EB] text-xl font-bold text-[#FF6B35] ring-4 ring-white shadow-md">
                                {(firstName[0] || "?").toUpperCase()}
                            </div>
                        )}
                        <div className="min-w-0 flex-1 pt-1">
                            <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">Student Profile</p>
                            <h2 className="mt-0.5 truncate text-xl font-bold text-slate-900">{fullName}</h2>
                            <p className="truncate text-sm text-slate-500">{email}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-3 divide-x divide-slate-100 border-y border-slate-100">
                    {[
                        { label: "Enrolled", value: courses.length },
                        { label: "Avg Progress", value: `${avgProgress}%` },
                        { label: "Paid", value: paidCount },
                    ].map((stat) => (
                        <div key={stat.label} className="py-4 text-center">
                            <p className="text-xl font-bold text-slate-900">{stat.value}</p>
                            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{stat.label}</p>
                        </div>
                    ))}
                </div>

                <div className="px-6 py-5">
                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Details</p>
                    <div className="space-y-2.5">
                        {[
                            { label: "ID", value: s.mockId || s.studentId || "—" },
                            { label: "Email", value: email },
                            phone ? { label: "Phone", value: phone } : null,
                        ].filter(Boolean).map(({ label, value }) => (
                            <div key={label} className="flex items-baseline gap-3 text-sm">
                                <span className="w-12 shrink-0 text-slate-400">{label}</span>
                                <span className="break-all font-medium text-slate-900">{value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {courses.length > 0 && (
                    <div className="border-t border-slate-100 px-6 py-5">
                        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Enrolled Courses ({courses.length})
                        </p>
                        <div className="space-y-3">
                            {courses.map((enrollment, i) => {
                                const course = enrollment.courseId;
                                const paid = enrollment.payments?.some((p) => p.PaymentStatus === "completed");
                                const prog = enrollment.progress;
                                return (
                                    <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-slate-900">{course?.name || "Unknown Course"}</p>
                                                {course?.code && <p className="text-xs text-slate-500">{course.code}</p>}
                                            </div>
                                            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                                                paid ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"
                                            }`}>
                                                {paid ? "Paid" : "Pending"}
                                            </span>
                                        </div>
                                        {prog != null && (
                                            <div className="mt-3">
                                                <div className="mb-1 flex items-center justify-between">
                                                    <span className="text-[10px] text-slate-400">Progress</span>
                                                    <span className="text-[10px] font-semibold text-slate-700">{prog}%</span>
                                                </div>
                                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                                                    <div
                                                        className="h-full rounded-full bg-[#FF6B35] transition-all"
                                                        style={{ width: `${Math.min(prog, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        {course?.mode && (
                                            <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                                                course.mode === "online" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
                                            }`}>
                                                {course.mode}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </>
        );
    };

    return (
        <>
            {/* Toolbar */}
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:w-72">
                    <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                    <input
                        type="text"
                        placeholder="Search students…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative" ref={sortRef}>
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
                            <div className="absolute right-0 z-40 mt-2 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
                                {SORT_OPTIONS.map(({ value, label }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => { setSortOption(value); setSortOpen(false); }}
                                        className={`flex w-full items-center px-4 py-2.5 text-left text-sm transition hover:bg-slate-50 ${
                                            sortOption === value
                                                ? "bg-orange-50 font-semibold text-orange-700"
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
                            filters.status || filters.subcategory
                                ? "border-orange-300 bg-orange-50 text-orange-700"
                                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                    >
                        <FaFilter size={13} /> Filter
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
                            <FiX size={18} />
                        </button>
                        <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">Filter</p>
                        <h2 className="mt-1 text-lg font-bold text-slate-900">Filter students</h2>

                        <div className="mt-5 space-y-4">
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Category</label>
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                >
                                    <option value="">All categories</option>
                                    {allCategories.map((sub, idx) => (
                                        <option key={idx} value={sub}>{sub}</option>
                                    ))}
                                </select>
                            </div>
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
                data={displayedStudentsWithId}
                itemsPerPage={12}
                emptyMessage="No enrolled students found."
                onCopyDetails={handleCopyDetails}
                onDeleteSelected={(selectedIds) => console.log("Delete these students:", selectedIds)}
                renderCard={(row, { selected, onSelect }) => {
                    const firstName = row.userId?.name?.firstName || "";
                    const lastName = row.userId?.name?.lastName || "";
                    const fullName = `${firstName} ${lastName}`.trim() || "Unknown";
                    const course = row.enrolledCourses?.[0]?.courseId;
                    const paid = row.enrolledCourses?.[0]?.payments?.some((p) => p.PaymentStatus === "completed");
                    const mode = course?.mode;
                    const progress = row.enrolledCourses?.[0]?.progress;

                    return (
                        <PersonCard
                            avatarSrc={row.userId?.image || undefined}
                            name={fullName}
                            subtitle={course?.name || "No course"}
                            statusBadge={
                                paid
                                    ? { label: "Paid", className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", dot: true, dotClass: "bg-emerald-500" }
                                    : { label: "Pending", className: "bg-orange-50 text-orange-700 ring-1 ring-orange-200", dot: true, dotClass: "bg-orange-500" }
                            }
                            meta={[
                                { label: "Student ID", value: row.mockId },
                                { label: "Course Code", value: course?.code || "N/A" },
                                { label: "Progress", value: progress != null ? `${progress}%` : "N/A" },
                                {
                                    label: "Mode",
                                    value: mode,
                                    render: (v) => v ? (
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                            v === "online" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
                                        }`}>
                                            {v.charAt(0).toUpperCase() + v.slice(1)}
                                        </span>
                                    ) : "N/A",
                                },
                            ]}
                            onView={() => setSlideOver({ open: true, student: row })}
                            primaryLabel="View Student"
                            menuItems={[
                                {
                                    label: "Copy Details",
                                    icon: <FiClipboard size={14} />,
                                    onClick: () => handleCopyDetails([row]),
                                },
                            ]}
                            selected={selected}
                            onSelect={onSelect}
                        />
                    );
                }}
            />

            <SlideOver
                open={slideOver.open}
                onClose={closeSlideOver}
                footer={
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={closeSlideOver}
                            className="flex-1 rounded-2xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                        >
                            Close
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                const id = slideOver.student?._id;
                                if (!id) return;
                                closeSlideOver();
                                navigate(`/admin/student-management/students/${encodeURIComponent(id)}`, { state: { student: slideOver.student } });
                            }}
                            className="flex-1 rounded-2xl bg-[#FF6B35] py-2.5 text-sm font-semibold text-white transition hover:bg-[#fd5a1f]"
                        >
                            View Full Profile →
                        </button>
                    </div>
                }
            >
                {renderStudentSlide()}
            </SlideOver>
        </>
    );
};

export default EnrolledStudents;
