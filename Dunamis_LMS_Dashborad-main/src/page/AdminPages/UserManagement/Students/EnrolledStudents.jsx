import React, { useEffect, useState, useRef } from "react";
import { FaMusic, FaPersonBooth, FaLanguage, FaSortAmountDown, FaFilter, FaSearch } from "react-icons/fa";
import { FaPencil } from "react-icons/fa6";
import { toast } from "react-hot-toast";
import DataTable from "../../../../components/Table";
import { useNavigate } from "react-router-dom";
import { X } from "react-feather";
import { useDispatch, useSelector } from "react-redux";
import { getStudentsByType } from "../../../../redux/Student/StudentSlice";

const EnrolledStudents = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [searchTerm, setSearchTerm] = useState("");
    const [sortOpen, setSortOpen] = useState(false);
    const [sortOption, setSortOption] = useState("");
    const [filterOpen, setFilterOpen] = useState(false);
    const [filters, setFilters] = useState({ status: "", subcategory: "" });
    const [selectedCategory, setSelectedCategory] = useState("");
    const sortRef = useRef();
    const filterRef = useRef();

    const { studentsByType } = useSelector((state) => state.student);

    const SORT_OPTIONS = [
        { value: "name", label: "Name" },
        { value: "courseName", label: "Course Name" },
        { value: "progress", label: "Progress" },
        { value: "feeStatus", label: "Fee Status" },
    ];

    const allCategories = ["Music", "Dance", "Language"];

    useEffect(() => {
        dispatch(getStudentsByType());
    }, [dispatch]);

    // Close sort/filter when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false);
            if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const enrolledStudents = studentsByType?.enrolled || [];

    const handleCopyDetails = (students) => {
        const studentArray = Array.isArray(students) ? students : [students];
        if (!studentArray.length) return toast.error("No student data to copy!");
        const details = studentArray
            .map(
                (s) => {
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
                }
            )
            .join("\n\n====================\n\n");
        navigator.clipboard.writeText(details).then(() => toast.success("Details copied!"));
    };

    const onSortChange = (value) => setSortOption(value);
    const onFilterChange = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));
    const clearFilters = () => {
        setFilters({ status: "", subcategory: "" });
        setSelectedCategory("");
    };

    let displayedStudents = enrolledStudents;

    // Search by name
    if (searchTerm) {
        displayedStudents = displayedStudents.filter((s) => {
            const fullName = `${s.userId?.name?.firstName || ""} ${s.userId?.name?.lastName || ""}`.toLowerCase();
            return fullName.includes(searchTerm.toLowerCase());
        });
    }

    // Filter by fee status
    if (filters.status)
        displayedStudents = displayedStudents.filter((s) =>
            s.enrolledCourses?.some(
                (c) =>
                    (filters.status === "Paid" && c.payments?.some((p) => p.PaymentStatus === "completed")) ||
                    (filters.status === "Pending" && !c.payments?.some((p) => p.PaymentStatus === "completed"))
            )
        );

    // Filter by category
    if (filters.subcategory)
        displayedStudents = displayedStudents.filter((s) =>
            s.enrolledCourses?.some((c) => c.courseId?.category === filters.subcategory)
        );

    // Sort
    if (sortOption) {
        displayedStudents.sort((a, b) => {
            if (sortOption === "name") {
                const nameA = `${a.userId?.name?.firstName || ""} ${a.userId?.name?.lastName || ""}`;
                const nameB = `${b.userId?.name?.firstName || ""} ${b.userId?.name?.lastName || ""}`;
                return nameA.localeCompare(nameB);
            }
            return 0; // extend later if needed
        });
    }
    const displayedStudentsWithId = displayedStudents.map((student, index) => ({
        ...student,
        mockId: `#ERD-${1000 + index}`,
    }));

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


    const renderCourses = (enrolledCourses) => {
        if (!enrolledCourses?.length) return "N/A";
        return enrolledCourses.map((c) => {
            const course = c.courseId;
            const paid = c.payments?.some((p) => p.PaymentStatus === "completed");
            return (
                <div key={c._id} className="mb-2 p-2 border rounded-lg bg-gray-50">
                    <div className="font-medium">{course?.name || "N/A"}</div>
                    <div className="text-xs text-gray-600">Code: {course?.code || "N/A"}</div>
                    <div className="text-xs text-gray-600">Progress: {c.progress || 0}%</div>
                    <div className="text-xs text-gray-600">
                        Mode: {course?.mode || "N/A"} | Fee: <span className={paid ? "text-green-500" : "text-orange-500"}>{paid ? "Paid" : "Pending"}</span>
                    </div>
                </div>
            );
        });
    };

    const columns = [
        {
            key: "studentId",
            header: "Student ID",
            render: (value, row) => row.mockId || "N/A"
        },
        {
            key: "name",
            header: "User",
            render: (_, row) => (
                <div className="flex items-center gap-2 min-w-[180px] max-w-[250px]">
                    <img
                        src={row.userId?.image || "/default-avatar.png"}
                        alt={`${row.userId?.name?.firstName || ""} ${row.userId?.name?.lastName || ""}`}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                    <span className="truncate max-w-[200px]" title={`${row.userId?.name?.firstName || "N/A"} ${row.userId?.name?.lastName || ""}`}>
                        {row.userId?.name?.firstName || "N/A"} {row.userId?.name?.lastName || ""}
                    </span>
                </div>
            ),
        },

        {
            key: "courseName",
            header: "Course Name",
            render: (_, row) => {
                const course = row.enrolledCourses?.[0]?.courseId;
                return course?.name || "N/A";
            },
        },
        {
            key: "courseCode",
            header: "Course Code",
            render: (_, row) => {
                const course = row.enrolledCourses?.[0]?.courseId;
                return course?.code || "N/A";
            },
        },
        {
            key: "progress",
            header: "Progress",
            render: (_, row) => {
                const progress = row.enrolledCourses?.[0]?.progress;
                return progress != null ? `${progress}%` : "N/A";
            },
        },
        {
            key: "mode",
            header: "Mode",
            render: (_, row) => {
                const mode = row.enrolledCourses?.[0]?.courseId?.mode;
                return (
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${mode === "online" ? "text-green-500" : "text-blue-500"}`}>
                        {mode || "N/A"}
                    </span>
                );
            },
        },
        {
            key: "feeStatus",
            header: "Fee Status",
            render: (_, row) => {
                const paid = row.enrolledCourses?.[0]?.payments?.some(p => p.PaymentStatus === "completed");
                return (
                    <span className={`font-medium ${paid ? "text-green-500" : "text-orange-500"}`}>
                        {paid ? "Paid" : "Pending"}
                    </span>
                );
            },
        },
        // {
        //     key: "action",
        //     header: "Action",
        //     render: (_, row) => (
        //         <button
        //             onClick={(e) => {
        //                 e.stopPropagation();
        //                 toast.success(`Edit student: ${row.userId?.name?.firstName || "N/A"}`);
        //             }}
        //         >
        //             <FaPencil />
        //         </button>
        //     ),
        // },
    ];

    return (
        <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="relative w-full md:w-1/3">
                    <input
                        type="text"
                        placeholder="Search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full border rounded-2xl py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-black"
                    />
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                </div>
                <div className="flex gap-2 mt-2 md:mt-0">
                    <div className="relative" ref={sortRef}>
                        <button
                            className="flex items-center gap-1 px-4 py-2 rounded-2xl border border-black text-sm bg-white hover:bg-gray-100"
                            onClick={() => setSortOpen(!sortOpen)}
                        >
                            <FaSortAmountDown /> Sort
                        </button>
                        {sortOpen && (
                            <ul className="absolute z-40 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg text-sm font-medium">
                                {SORT_OPTIONS.map(({ value, label }) => (
                                    <li
                                        key={value}
                                        className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${sortOption === value ? "bg-gray-200 font-semibold" : ""}`}
                                        onClick={() => {
                                            onSortChange(value);
                                            setSortOpen(false);
                                        }}
                                    >
                                        {label}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div ref={filterRef}>
                        <button
                            className="flex items-center gap-1 px-4 py-2 rounded-2xl border border-black text-sm bg-white hover:bg-gray-100"
                            onClick={() => setFilterOpen(true)}
                        >
                            <FaFilter /> Filter
                        </button>
                    </div>
                </div>
            </div>

            {filterOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex justify-center items-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
                        <button
                            onClick={() => setFilterOpen(false)}
                            className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-xl font-bold"
                        >
                            <X />
                        </button>
                        <h2 className="text-xl font-semibold mb-4">Filter Categories</h2>
                        <label className="block mb-2 font-medium">Category</label>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full mb-4 border rounded px-3 py-2"
                        >
                            <option value="">All</option>
                            {allCategories.map((sub, idx) => (
                                <option key={idx} value={sub}>
                                    {sub}
                                </option>
                            ))}
                        </select>
                        <div className="flex justify-between mt-6">
                            <button onClick={clearFilters} className="px-4 py-2 rounded-2xl border border-gray-500 hover:bg-gray-100">
                                Clear Filters
                            </button>
                            <button onClick={() => setFilterOpen(false)} className="px-4 py-2 rounded-2xl bg-black text-white hover:bg-gray-800">
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <DataTable
                data={displayedStudentsWithId}
                columns={columns}
                itemsPerPage={10}
                emptyMessage="No enrolled students found."
                onCopyDetails={handleCopyDetails}
                onRowClick={handleRowClick}
                onDeleteSelected={(selectedIds) => console.log("Delete these students:", selectedIds)}
            />
        </>
    );
};

export default EnrolledStudents;
