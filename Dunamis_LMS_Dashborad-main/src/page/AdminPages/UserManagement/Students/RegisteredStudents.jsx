import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAllUsers } from "../../../../redux/User/UserSlice";
import DataTable from "../../../../components/Table";
import toast from "react-hot-toast";
import { FaEllipsisH, FaFilter, FaSearch, FaSortAmountDown } from "react-icons/fa";
import { X } from "react-feather";

const IMAGE = import.meta.env.VITE_IMAGE;
const token = localStorage.getItem("token");

const SORT_OPTIONS = [
    { value: "name-asc", label: "Name A-Z" },
    { value: "name-desc", label: "Name Z-A" },
    { value: "date-asc", label: "Registration Date Asc" },
    { value: "date-desc", label: "Registration Date Desc" },
];

const RegisteredStudents = () => {
    const dispatch = useDispatch();
    const [searchTerm, setSearchTerm] = useState('');
    const { users, loading, error } = useSelector((state) => state.user);

    const [dropdownOpen, setDropdownOpen] = useState(null);
    const [sortOpen, setSortOpen] = useState(false);
    const [sortOption, setSortOption] = useState("");
    const [filterOpen, setFilterOpen] = useState(false);
    const [filters, setFilters] = useState({ status: "", followUp: "", dateFrom: "", dateTo: "" });
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (token) {
            dispatch(getAllUsers(token));
        } else {
            toast.error("No token found. Please login.");
        }
    }, [dispatch]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getImageUrl = (imagePath) => {
        if (!imagePath) return "https://i.pravatar.cc/150?img=32";
        if (imagePath.startsWith("http")) return imagePath;
        return `${IMAGE}${imagePath}`;
    };

    let students = Array.isArray(users)
        ? users
            .filter((user) => user.accountType === "student")
            .map((user, index) => ({
                id: user._id,
                studentId: `#STU-${index + 1000}`,
                name: `${user.name?.firstName || ""} ${user.name?.lastName || ""}`,
                email: user.email,
                mobileNumber: user.mobileNo,
                avatar: getImageUrl(user.image),
                registrationDate: new Date(user.createdAt).toLocaleDateString(),
                followUp1: user.followUp1 || "Pending",
                followUp2: user.followUp2 || "Pending",
                followUp3: user.followUp3 || "Pending",
                status: user.status || "Active",
            }))
        : [];

    if (filters.status) {
        students = students.filter((s) => s.status === filters.status);
    }
    if (filters.followUp) {
        students = students.filter(
            (s) => s.followUp1 === filters.followUp || s.followUp2 === filters.followUp || s.followUp3 === filters.followUp
        );
    }
    if (filters.dateFrom) {
        students = students.filter((s) => new Date(s.registrationDate) >= new Date(filters.dateFrom));
    }
    if (filters.dateTo) {
        students = students.filter((s) => new Date(s.registrationDate) <= new Date(filters.dateTo));
    }

    const filteredStudents = students.filter((student) =>
        Object.values(student).some((value) =>
            String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    if (sortOption) {
        switch (sortOption) {
            case "name-asc":
                filteredStudents.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case "name-desc":
                filteredStudents.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case "date-asc":
                filteredStudents.sort((a, b) => new Date(a.registrationDate) - new Date(b.registrationDate));
                break;
            case "date-desc":
                filteredStudents.sort((a, b) => new Date(b.registrationDate) - new Date(a.registrationDate));
                break;
            default:
                break;
        }
    }

    const handleCopyDetails = (selectedRows) => {
        const details = selectedRows
            .map(
                (s) => `Name: ${s.name}
ID: ${s.studentId}
Email: ${s.email}
Mobile: ${s.mobileNumber}
Registration Date: ${s.registrationDate}
Follow-up 1: ${s.followUp1}
Follow-up 2: ${s.followUp2}
Follow-up 3: ${s.followUp3}`
            )
            .join("\n\n---\n\n");

        navigator.clipboard.writeText(details)
            .then(() => toast.success("Student details copied to clipboard!"))
            .catch(() => toast.error("Failed to copy details!"));
    };

    const columns = [
        { key: "studentId", header: "Student ID" },
        {
            key: "name",
            header: "User",
            render: (_, row) => (
                <div className="flex items-center gap-2 min-w-[180px] max-w-[250px]">
                    <img
                        src={row.avatar}
                        alt={row.name}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                        onError={(e) => {
                            e.target.src = "https://i.pravatar.cc/150?img=32";
                        }}
                    />
                    <span className="truncate max-w-[200px]" title={row.name}>
                        {row.name}
                    </span>
                </div>
            ),
        },
        { key: "email", header: "Email" },
        { key: "mobileNumber", header: "Mobile Number" },
        { key: "registrationDate", header: "Registration Date" },
        {
            key: "action",
            header: "Action",
            render: (_, row) => (
                <div className="relative">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setDropdownOpen(dropdownOpen === row.id ? null : row.id);
                        }}
                    >
                        <FaEllipsisH className="text-gray-600 text-lg cursor-pointer" />
                    </button>
                    {dropdownOpen === row.id && (
                        <div
                            ref={dropdownRef}
                            className="absolute right-0 mt-2 w-40 bg-white border shadow-lg rounded-md z-10"
                        >
                            <ul className="text-sm">
                                <li className="px-4 py-2 hover:bg-gray-200 cursor-pointer">Block</li>
                                <li className="px-4 py-2 hover:bg-gray-200 cursor-pointer">Report</li>
                                <li className="px-4 py-2 hover:bg-gray-200 cursor-pointer">Disable Account</li>
                                <li className="px-4 py-2 hover:bg-gray-200 cursor-pointer">Archive</li>
                            </ul>
                        </div>
                    )}
                </div>
            ),
        },
    ];

    const onFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => setFilters({ status: "", followUp: "", dateFrom: "", dateTo: "" });

    const onSortChange = (value) => setSortOption(value);

    return (
        <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Registered Students</h2>
            {loading && <p>Loading users...</p>}
            {error && <p className="text-red-500">Error: {error}</p>}

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
                    <div className="relative">
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
                                        onClick={() => { onSortChange(value); setSortOpen(false); }}
                                    >
                                        {label}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <button
                        className="flex items-center gap-1 px-4 py-2 rounded-2xl border border-black text-sm bg-white hover:bg-gray-100"
                        onClick={() => setFilterOpen(true)}
                    >
                        <FaFilter /> Filter
                    </button>
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
                        <h2 className="text-xl font-semibold mb-4">Filter Options</h2>

                        <label className="block mb-2 font-medium">Status</label>
                        <select
                            value={filters.status || ""}
                            onChange={(e) => onFilterChange("status", e.target.value)}
                            className="w-full mb-4 border rounded px-3 py-2"
                        >
                            <option value="">All</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>

                        <label className="block mb-2 font-medium">Follow-up</label>
                        <select
                            value={filters.followUp || ""}
                            onChange={(e) => onFilterChange("followUp", e.target.value)}
                            className="w-full mb-4 border rounded px-3 py-2"
                        >
                            <option value="">All</option>
                            <option value="Complete">Complete</option>
                            <option value="Pending">Pending</option>
                        </select>

                        <label className="block mb-2 font-medium">Registration From</label>
                        <input
                            type="date"
                            value={filters.dateFrom || ""}
                            onChange={(e) => onFilterChange("dateFrom", e.target.value)}
                            className="w-full mb-4 border rounded px-3 py-2"
                        />
                        <label className="block mb-2 font-medium">Registration To</label>
                        <input
                            type="date"
                            value={filters.dateTo || ""}
                            onChange={(e) => onFilterChange("dateTo", e.target.value)}
                            className="w-full mb-4 border rounded px-3 py-2"
                        />

                        <div className="flex justify-between mt-6">
                            <button
                                onClick={clearFilters}
                                className="px-4 py-2 rounded-2xl border border-gray-500 hover:bg-gray-100"
                            >
                                Clear Filters
                            </button>
                            <button
                                onClick={() => setFilterOpen(false)}
                                className="px-4 py-2 rounded-2xl bg-black text-white hover:bg-gray-800"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <DataTable
                data={filteredStudents}
                columns={columns}
                itemsPerPage={10}
                emptyMessage="No registered students found"
                onCopyDetails={handleCopyDetails}
            />
        </div>
    );
};

export default RegisteredStudents;
