import React, { useEffect, useState, useRef } from "react";
import { FaSearch, FaFilter, FaSortAmountDown } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import DataTable from "../../components/Table";
import {
    assignEnquiry,
    getAllEnquiries,
    respondEnquiry,
} from "../../redux/Enquiry/EnquirySlice";
import { fetchAdmins } from "../../redux/Admin/AdminSlice";
import { X } from "phosphor-react";
import { getStoredUser } from "../../utils/authSession";

const SORT_OPTIONS = [
    { value: "name-asc", label: "Name A-Z" },
    { value: "name-desc", label: "Name Z-A" },
    { value: "date-asc", label: "Date Asc" },
    { value: "date-desc", label: "Date Desc" },
];

const FILTER_OPTIONS = [
    { value: "new", label: "New" },
    { value: "in-progress", label: "In Progress" },
    { value: "resolved", label: "Resolved" },
];

const EnquiriesPage = () => {
    const dispatch = useDispatch();
    const { enquiries, loading, error } = useSelector((state) => state.enquiry);
    const { admins } = useSelector((state) => state.admin);

    const [searchTerm, setSearchTerm] = useState("");
    const [sortOpen, setSortOpen] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const [sortOption, setSortOption] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedEnquiry, setSelectedEnquiry] = useState(null);
    const [assignTo, setAssignTo] = useState("");
    const [response, setResponse] = useState("");

    const sortRef = useRef(null);

    // Get current user from localStorage
    const currentUser = getStoredUser() || {};
    const currentAdminRoleId = currentUser.roleId; // Get the roleId to match with assignedTo

    // Check if user is superadmin by checking the role field or accountType
    const isSuperAdmin = currentUser.role === 'superadmin' ||
        currentUser.accountType === 'superadmin' ||
        currentUser.adminDetails?.role === 'superadmin';

    useEffect(() => {
        dispatch(getAllEnquiries());
        dispatch(fetchAdmins());
    }, [dispatch]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (sortRef.current && !sortRef.current.contains(e.target)) {
                setSortOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const openModal = (enquiry) => {
        setSelectedEnquiry(enquiry);
        setAssignTo(enquiry.assignedTo?._id || "");
        setResponse(enquiry.response?.message || "");
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setSelectedEnquiry(null);
        setAssignTo("");
        setResponse("");
    };

    const saveChanges = () => {
        if (selectedEnquiry) {
            if (assignTo)
                dispatch(assignEnquiry({ id: selectedEnquiry._id, adminId: assignTo }));
            if (response.trim())
                dispatch(respondEnquiry({ id: selectedEnquiry._id, message: response }));
        }
        closeModal();
    };

    // Role-based filtering: Show all enquiries for superadmin, only assigned for others
    let roleFilteredData = isSuperAdmin
        ? enquiries
        : enquiries.filter(enquiry => {
            // Match by admin's roleId (which is the _id in admin collection)
            return enquiry.assignedTo?._id === currentAdminRoleId;
        });

    // Apply search filter
    let filteredData = roleFilteredData.filter((item) =>
        item.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Apply status filter
    if (statusFilter) {
        filteredData = filteredData.filter(
            (item) => item.status?.toLowerCase() === statusFilter.toLowerCase()
        );
    }

    // Sorting
    if (sortOption) {
        switch (sortOption) {
            case "name-asc":
                filteredData.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
                break;
            case "name-desc":
                filteredData.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
                break;
            case "date-asc":
                filteredData.sort(
                    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
                );
                break;
            case "date-desc":
                filteredData.sort(
                    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
                );
                break;
            default:
                break;
        }
    }

    const columns = [
        {
            key: "name",
            header: "User",
            render: (_, row) => (
                <div className="flex items-center gap-2">
                    {row.avatar && (
                        <img
                            src={row.avatar}
                            alt={row.name}
                            className="w-8 h-8 rounded-full"
                        />
                    )}
                    <span>{row.name}</span>
                </div>
            ),
        },
        { key: "email", header: "Email" },
        { key: "subject", header: "Subject" },
        {
            key: "message",
            header: "Message",
            render: (value) => (
                <span>{value}</span>
            ),
        },
        {
            key: "createdAt",
            header: "Time & Date",
            render: (value) => new Date(value).toLocaleString(),
        },
        {
            key: "status",
            header: "Status",
            render: (value) => {
                const color =
                    value === "resolved"
                        ? "text-green-600"
                        : value === "archived"
                            ? "text-gray-500"
                            : "text-blue-600";
                return <span className={`text-sm font-medium ${color}`}>● {value}</span>;
            },
        },
        {
            key: "assignedTo",
            header: "Assigned To",
            render: (value) => {
                const nameObj = value?.userId?.name;
                const fullName = nameObj
                    ? `${nameObj.firstName} ${nameObj.lastName}`
                    : "—";
                return <span>{fullName}</span>;
            },
        },
        {
            key: "response",
            header: "Response",
            render: (value) => value?.message || "—",
        },
        {
            key: "actions",
            header: "Actions",
            render: (_, row) => (
                <button
                    onClick={() => openModal(row)}
                    className="px-2 py-1 text-sm bg-black text-white rounded-2xl hover:bg-gray-900"
                >
                    Assign & Respond
                </button>
            ),
        },
    ];

    return (
        <div className="p-6 bg-white min-h-screen">
            {/* Search + Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div className="relative w-full md:w-1/3">
                    <input
                        type="text"
                        placeholder="Search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-2xl border focus:outline-none focus:ring-2 focus:ring-black"
                    />
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Sort Dropdown */}
                    <div className="relative" ref={sortRef}>
                        <button
                            className="flex items-center gap-1 px-4 py-2 rounded-2xl border border-black text-sm bg-white hover:bg-gray-100"
                            onClick={() => setSortOpen(!sortOpen)}
                        >
                            <FaSortAmountDown /> Sort
                        </button>
                        {sortOpen && (
                            <ul className="absolute right-0 z-40 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg text-sm font-medium">
                                {SORT_OPTIONS.map(({ value, label }) => (
                                    <li
                                        key={value}
                                        className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${sortOption === value ? "bg-gray-200 font-semibold" : ""
                                            }`}
                                        onClick={() => {
                                            setSortOption(value);
                                            setSortOpen(false);
                                        }}
                                    >
                                        {label}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Filter */}
                    <button
                        className="flex items-center gap-1 px-4 py-2 rounded-2xl border border-black text-sm bg-white hover:bg-gray-100"
                        onClick={() => setFilterOpen(true)}
                    >
                        <FaFilter /> Filter
                    </button>
                </div>
            </div>

            {/* Filter Modal */}
            {filterOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex justify-center items-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
                        <button
                            onClick={() => setFilterOpen(false)}
                            className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-xl font-bold"
                        >
                            <X />
                        </button>
                        <h2 className="text-xl font-semibold mb-4">Filter Enquiries</h2>

                        <label className="block mb-2 font-medium">Status</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full mb-4 border rounded px-3 py-2"
                        >
                            <option value="">All Status</option>
                            {FILTER_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>

                        <div className="flex justify-between mt-6">
                            <button
                                className="px-4 py-2 rounded-2xl border hover:bg-gray-200"
                                onClick={() => setStatusFilter("")}
                            >
                                Clear
                            </button>
                            <button
                                className="px-4 py-2 rounded-2xl bg-black text-white hover:bg-gray-800"
                                onClick={() => setFilterOpen(false)}
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DataTable */}
            {loading ? (
                <div>Loading...</div>
            ) : error ? (
                <div>Error: {error}</div>
            ) : filteredData.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center text-gray-500">
                    No enquiries found.
                </div>
            ) : (
                <DataTable data={filteredData} columns={columns} selectable={false} />
            )}

            {/* Assign & Respond Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-96 max-w-full">
                        <h3 className="text-xl font-semibold mb-4">Assign & Respond</h3>

                        <div className="mb-4">
                            <label className="block mb-1 font-medium">Assign To:</label>
                            <select
                                value={assignTo}
                                onChange={(e) => setAssignTo(e.target.value)}
                                className="w-full border rounded-2xl px-3 py-2 focus:outline-none"
                            >
                                <option value="">Select admin</option>
                                {admins?.map((admin) => (
                                    <option key={admin._id} value={admin._id}>
                                        {admin.userId?.name?.firstName}{" "}
                                        {admin.userId?.name?.lastName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="mb-4">
                            <label className="block mb-1 font-medium">Response:</label>
                            <textarea
                                value={response}
                                onChange={(e) => setResponse(e.target.value)}
                                rows={4}
                                placeholder="Enter your response here"
                                className="w-full border rounded-2xl px-3 py-2 focus:outline-none"
                            />
                        </div>

                        <div className="flex justify-end gap-4">
                            <button
                                onClick={closeModal}
                                className="px-4 py-2 rounded-2xl bg-gray-300 hover:bg-gray-400"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveChanges}
                                className="px-4 py-2 rounded-2xl bg-black text-white hover:bg-gray-900"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EnquiriesPage;
