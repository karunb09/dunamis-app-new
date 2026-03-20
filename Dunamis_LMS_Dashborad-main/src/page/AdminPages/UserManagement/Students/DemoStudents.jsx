import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import DataTable from "../../../../components/Table";
import toast from "react-hot-toast";
import { FaSearch, FaFilter, FaSortAmountDown, FaPencilAlt } from "react-icons/fa";
import { X } from "react-feather";
import { getAllBookings, updateBookingStatus } from "../../../../redux/DemoBooking/DemoBookingSlice";

const SORT_OPTIONS = [
    { value: "name-asc", label: "Name A-Z" },
    { value: "name-desc", label: "Name Z-A" },
    { value: "demoStatus-asc", label: "Demo Status Asc" },
    { value: "demoStatus-desc", label: "Demo Status Desc" },
];

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
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || teacherUser?.email || "Not assigned";
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

    const updateStudent = async (id, key, value) => {
        try {
            await dispatch(updateBookingStatus({ id, updatedData: { [key]: value } }));
            toast.success("Updated successfully!");
            dispatch(getAllBookings());
        } catch {
            toast.error("Update failed!");
        }
    };

    const onFilterChange = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));
    const clearFilters = () => setFilters({ demoStatus: "", enrollmentStatus: "", followUp: "" });
    const onSortChange = (value) => setSortOption(value);

    const studentsWithMockId = Array.isArray(bookings)
        ? bookings.map((row, index) => ({
            ...row,
            mockId: `#DEMO-${1000 + index}`,
        }))
        : [];

    let filteredStudents = studentsWithMockId;

    if (searchTerm) {
        filteredStudents = filteredStudents.filter(row => {
            const student = getBookingStudentMeta(row);
            const course = getBookingCourse(row);
            const instructor = getBookingTeacherName(row);
            const haystack = [
                student.name,
                student.email,
                student.phone,
                course?.name,
                course?.code,
                instructor,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return haystack.includes(searchTerm.toLowerCase());
        });
    }

    if (filters.demoStatus) {
        filteredStudents = filteredStudents.filter(s => s.demoStatus === filters.demoStatus);
    }
    if (filters.enrollmentStatus) {
        filteredStudents = filteredStudents.filter(s => s.enrollmentStatus === filters.enrollmentStatus);
    }
    if (filters.followUp) {
        filteredStudents = filteredStudents.filter(s => s.followUp === filters.followUp);
    }

    if (sortOption) {
        switch (sortOption) {
            case "name-asc":
                filteredStudents.sort((a, b) => {
                    return getBookingStudentMeta(a).name.localeCompare(getBookingStudentMeta(b).name);
                });
                break;
            case "name-desc":
                filteredStudents.sort((a, b) => {
                    return getBookingStudentMeta(b).name.localeCompare(getBookingStudentMeta(a).name);
                });
                break;
            case "demoStatus-asc":
                filteredStudents.sort((a, b) => (a.demoStatus || "").localeCompare(b.demoStatus || ""));
                break;
            case "demoStatus-desc":
                filteredStudents.sort((a, b) => (b.demoStatus || "").localeCompare(a.demoStatus || ""));
                break;
            default:
                break;
        }
    }

    const handleCopyDetails = (selectedRows) => {
        const details = selectedRows.map(s => {
            const student = getBookingStudentMeta(s);
            const course = getBookingCourse(s);
            return `
Student ID: ${s.mockId || "N/A"}
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
Slot: ${getBookingSlotLabel(s)}
            `.trim();
        }).join("\n\n---\n\n");
        navigator.clipboard.writeText(details).then(() => toast.success("Copied to clipboard!"));
    };

    const columns = [
        { key: "mockId", header: "Student ID", render: (_, row) => row.mockId || "N/A" },
        {
            key: "user",
            header: "User",
            render: (_, row) => {
                const student = getBookingStudentMeta(row);

                return (
                    <div className="flex items-center gap-2 min-w-[200px] max-w-[280px]">
                        <img
                            src={student.image}
                            alt={student.name}
                            className="w-8 h-8 rounded-full flex-shrink-0"
                        />
                        <div className="overflow-hidden">
                            <div className="font-medium truncate" title={student.name}>{student.name}</div>
                            <div
                                className="text-xs text-gray-500 truncate max-w-[220px]"
                                title={student.email}
                            >
                                {student.email}
                            </div>
                            <div
                                className="text-xs text-gray-400 truncate max-w-[220px]"
                                title={student.phone}
                            >
                                {student.phone}
                            </div>
                        </div>
                    </div>
                );
            }
        },

        {
            key: "courseCategory",
            header: "Course Category",
            render: (_, row) => {
                const course = getBookingCourse(row);
                return course?.category?.name || "N/A";
            },
        },
        {
            key: "courseCode",
            header: "Course Code",
            render: (_, row) => {
                const course = getBookingCourse(row);
                return course?.code || "N/A";
            },
        },
        {
            key: "courseName",
            header: "Course Name",
            render: (_, row) => {
                const course = getBookingCourse(row);
                return course?.name || "N/A";
            },
        },
        {
            key: "instructor",
            header: "Assigned Instructor",
            render: (_, row) => {
                return (
                    <div className="flex items-center gap-2 min-w-[150px] max-w-[220px]">
                        <span className="truncate" title={getBookingTeacherName(row)}>
                            {getBookingTeacherName(row)}
                        </span>
                    </div>
                );
            },
        },
        { key: "mode", header: "Mode", render: (_, row) => getBookingMode(row) || "N/A" },
        { key: "slot", header: "Slot", render: (_, row) => getBookingSlotLabel(row) },
        {
            key: "demoStatus", header: "Demo Status", render: (_, row) => (
                <select value={row.demoStatus || ""} onChange={(e) => updateStudent(row._id, "demoStatus", e.target.value)} className="text-sm border rounded px-2 py-1">
                    <option value="Booked">Booked</option>
                    <option value="Attended">Attended</option>
                    <option value="Missed">Missed</option>
                    <option value="Rescheduled">Rescheduled</option>
                </select>
            )
        },
        {
            key: "enrollmentStatus", header: "Enrollment Status", render: (_, row) => (
                <select value={row.enrollmentStatus || ""} onChange={(e) => updateStudent(row._id, "enrollmentStatus", e.target.value)} className="text-sm border rounded px-2 py-1">
                    <option value="Not Enrolled">Not Enrolled</option>
                    <option value="Enrolled">Enrolled</option>
                </select>
            )
        },
        {
            key: "followUpStatus", header: "Follow Up Status", render: (_, row) => (
                <select value={row.followUp || ""} onChange={(e) => updateStudent(row._id, "followUp", e.target.value)} className="text-sm border rounded px-2 py-1">
                    <option value="Pending">Pending</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Closed">Closed</option>
                </select>
            )
        },
        {
            key: "response", header: "Response", render: (_, row) => (
                <input type="text" value={row.response || ""} onChange={(e) => updateStudent(row._id, "response", e.target.value)} placeholder="Enter response..." className="text-sm border rounded px-2 py-1 w-full" />
            )
        },
        {
            key: "action", header: "Action", render: (_, row) => (
                <button onClick={() => toast.success(`Edit ${row.mockId}`)}><FaPencilAlt /></button>
            )
        },
    ];

    return (
        <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Demo Requests</h2>
            <div className="mb-4 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                Demo bookings are automatically assigned to the instructor whose
                slot the learner selected. Admin does not need to manually assign
                a fresh request unless it needs to be rescheduled later.
            </div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="relative w-full md:w-1/3">
                    <input type="text" placeholder="Search by learner, email, course, or instructor..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full border rounded-2xl py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-black" />
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                </div>

                <div className="flex gap-2 mt-2 md:mt-0">
                    <div className="relative">
                        <button className="flex items-center gap-1 px-4 py-2 rounded-2xl border border-black text-sm bg-white hover:bg-gray-100" onClick={() => setSortOpen(!sortOpen)}>
                            <FaSortAmountDown /> Sort
                        </button>
                        {sortOpen && (
                            <ul className="absolute z-40 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg text-sm font-medium">
                                {SORT_OPTIONS.map(({ value, label }) => (
                                    <li key={value} className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${sortOption === value ? "bg-gray-200 font-semibold" : ""}`} onClick={() => { onSortChange(value); setSortOpen(false); }}>
                                        {label}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <button className="flex items-center gap-1 px-4 py-2 rounded-2xl border border-black text-sm bg-white hover:bg-gray-100" onClick={() => setFilterOpen(true)}>
                        <FaFilter /> Filter
                    </button>
                </div>
            </div>

            {filterOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex justify-center items-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
                        <button onClick={() => setFilterOpen(false)} className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-xl font-bold"><X /></button>
                        <h2 className="text-xl font-semibold mb-4">Filter Options</h2>

                        <label className="block mb-2 font-medium">Demo Status</label>
                        <select value={filters.demoStatus || ""} onChange={e => onFilterChange("demoStatus", e.target.value)} className="w-full mb-4 border rounded px-3 py-2">
                            <option value="">All</option>
                            <option value="Booked">Booked</option>
                            <option value="Attended">Attended</option>
                            <option value="Missed">Missed</option>
                            <option value="Rescheduled">Rescheduled</option>
                        </select>

                        <label className="block mb-2 font-medium">Enrollment Status</label>
                        <select value={filters.enrollmentStatus || ""} onChange={e => onFilterChange("enrollmentStatus", e.target.value)} className="w-full mb-4 border rounded px-3 py-2">
                            <option value="">All</option>
                            <option value="Enrolled">Enrolled</option>
                            <option value="Not Enrolled">Not Enrolled</option>
                        </select>

                        <label className="block mb-2 font-medium">Follow Up Status</label>
                        <select value={filters.followUp || ""} onChange={e => onFilterChange("followUp", e.target.value)} className="w-full mb-4 border rounded px-3 py-2">
                            <option value="">All</option>
                            <option value="Pending">Pending</option>
                            <option value="Contacted">Contacted</option>
                            <option value="Closed">Closed</option>
                        </select>

                        <div className="flex justify-between mt-6">
                            <button onClick={clearFilters} className="px-4 py-2 rounded-2xl border border-gray-500 hover:bg-gray-100">Clear Filters</button>
                            <button onClick={() => setFilterOpen(false)} className="px-4 py-2 rounded-2xl bg-black text-white hover:bg-gray-800">Apply</button>
                        </div>
                    </div>
                </div>
            )}

            <DataTable
                data={filteredStudents}
                columns={columns}
                itemsPerPage={10}
                emptyMessage="No demo students found"
                onCopyDetails={handleCopyDetails}
            />
        </div>
    );
};

export default DemoStudents;
