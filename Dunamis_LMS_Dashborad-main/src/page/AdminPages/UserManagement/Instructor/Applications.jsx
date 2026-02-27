import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import DataTable from "../../../../components/Table";
import { fetchAllApplications, updateApplicationStatus } from "../../../../redux/Intructor/teacherApplication";
import CredentialModal from "./CredentialModal";
import { FaFilter, FaSearch, FaSortAmountDown } from "react-icons/fa";
import { X } from "react-feather";

const SORT_OPTIONS = [
    { value: "name-asc", label: "Name A-Z" },
    { value: "name-desc", label: "Name Z-A" },
    { value: "createdAt-asc", label: "Application Date Asc" },
    { value: "createdAt-desc", label: "Application Date Desc" },
];

const Applications = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { allApplications, loading, error } = useSelector((state) => state.application);

    const [searchTerm, setSearchTerm] = useState("");
    const [sortOpen, setSortOpen] = useState(false);
    const [sortOption, setSortOption] = useState("");
    const [filterOpen, setFilterOpen] = useState(false);
    const [filters, setFilters] = useState({ status: "", mode: "" });
    const [selectedInstructor, setSelectedInstructor] = useState(null);
    const [generatedPassword, setGeneratedPassword] = useState("");
    const dropdownRef = useRef(null);

    useEffect(() => {
        dispatch(fetchAllApplications());
    }, [dispatch]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setSortOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredApplications = allApplications
        .filter((app) => {
            const fullName =
                typeof app?.name === "object"
                    ? `${app?.name?.firstName || ""} ${app?.name?.lastName || ""}`.toLowerCase()
                    : app?.name?.toLowerCase?.() || "";
            const email = app?.email?.toLowerCase() || "";
            const id = app?._id?.toLowerCase() || "";
            const term = searchTerm?.toLowerCase() || "";
            return fullName.includes(term) || email.includes(term) || id.includes(term);
        })
        .filter((app) => {
            if (filters.status && app.status !== filters.status) return false;
            if (filters.mode && app.mode !== filters.mode) return false;
            return true;
        })
        .map((app, index) => ({ ...app, mockId: `#APP-${1001 + index}` }));

    // Apply sorting
    if (sortOption) {
        switch (sortOption) {
            case "name-asc":
                filteredApplications.sort((a, b) => {
                    const nameA = typeof a.name === "object" ? `${a.name.firstName} ${a.name.lastName}` : a.name;
                    const nameB = typeof b.name === "object" ? `${b.name.firstName} ${b.name.lastName}` : b.name;
                    return nameA.localeCompare(nameB);
                });
                break;
            case "name-desc":
                filteredApplications.sort((a, b) => {
                    const nameA = typeof a.name === "object" ? `${a.name.firstName} ${a.name.lastName}` : a.name;
                    const nameB = typeof b.name === "object" ? `${b.name.firstName} ${b.name.lastName}` : b.name;
                    return nameB.localeCompare(nameA);
                });
                break;
            case "createdAt-asc":
                filteredApplications.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                break;
            case "createdAt-desc":
                filteredApplications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
        }
    }

    const handleStatusChange = (id, newStatus) => {
        dispatch(updateApplicationStatus({ id, status: newStatus }));
        const selectedApp = allApplications.find((app) => app._id === id);
        if (newStatus === "selected" && selectedApp) {
            const firstName = selectedApp?.name?.firstName || "User";
            const randomDigits = Math.floor(100 + Math.random() * 900);
            const password = `${firstName.toLowerCase()}dunamis@${randomDigits}`;
            setGeneratedPassword(password);
            setSelectedInstructor(selectedApp);
        }
    };

    const handleRowClick = (row) => navigate(`/applications/${row._id}`);

    const columns = [
        { key: "mockId", header: "Application ID" },
        {
            key: "name",
            header: "Instructor",
            render: (value, row) => {
                const fullName =
                    typeof row?.name === "object" ? `${row.name.firstName} ${row.name.lastName}` : row.name;
                return <div className="flex items-center gap-2">{fullName}</div>;
            },
        },
        { key: "email", header: "Email" },
        { key: "areaOfExpertise", header: "Specialization" },
        { key: "yearOfExperience", header: "Experience" },
        {
            key: "mode",
            header: "Mode",
            render: (value) => (
                <div className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${value === "online" ? "bg-green-500" : "bg-gray-400"}`}></span>
                    <span>{value}</span>
                </div>
            ),
        },
        { key: "createdAt", header: "Application Time & Date", render: (value) => new Date(value).toLocaleString() },
        {
            key: "status",
            header: "Status",
            render: (value, row) => (
                <select
                    value={row.status}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => handleStatusChange(row._id, e.target.value)}
                    className="border px-2 py-1 rounded text-sm bg-white"
                >
                    {["new", "shortlisted", "interviewed", "selected", "rejected"].map((status) => (
                        <option key={status} value={status}>
                            {status}
                        </option>
                    ))}
                </select>
            ),
        },
    ];

    return (
        <div className="p-4">
            {loading ? (
                <p>Loading applications...</p>
            ) : (
                <div className="overflow-x-auto">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        {/* Search */}
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

                        {/* Sort & Filter */}
                        <div className="flex gap-2">
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-gray-300 bg-white text-sm hover:bg-gray-100"
                                    onClick={() => setSortOpen(!sortOpen)}
                                >
                                    <FaSortAmountDown /> Sort
                                </button>
                                {sortOpen && (
                                    <ul className="absolute z-40 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg text-sm font-medium">
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

                            <button
                                className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-gray-300 bg-white text-sm hover:bg-gray-100"
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
                                    <X/>
                                </button>
                                <h2 className="text-xl font-semibold mb-4">Filter Applications</h2>

                                <label className="block mb-2 font-medium">Status</label>
                                <select
                                    value={filters.status}
                                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                    className="w-full mb-4 border rounded px-3 py-2"
                                >
                                    <option value="">All</option>
                                    <option value="new">New</option>
                                    <option value="shortlisted">Shortlisted</option>
                                    <option value="interviewed">Interviewed</option>
                                    <option value="selected">Selected</option>
                                    <option value="rejected">Rejected</option>
                                </select>

                                <label className="block mb-2 font-medium">Mode</label>
                                <select
                                    value={filters.mode}
                                    onChange={(e) => setFilters({ ...filters, mode: e.target.value })}
                                    className="w-full mb-4 border rounded px-3 py-2"
                                >
                                    <option value="">All</option>
                                    <option value="online">Online</option>
                                    <option value="offline">Offline</option>
                                </select>

                                <div className="flex justify-between mt-6">
                                    <button
                                            className="px-4 py-2 rounded-2xl border border-gray-300 hover:bg-gray-200"
                                        onClick={() => setFilters({ status: "", mode: "" })}
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

                    <DataTable
                        data={filteredApplications}
                        selectable={false}
                        columns={columns}
                        itemsPerPage={10}
                        onRowClick={handleRowClick}
                        rowClassName="cursor-pointer hover:bg-gray-50"
                    />
                </div>
            )}

            {selectedInstructor && (
                <CredentialModal
                    instructor={selectedInstructor}
                    password={generatedPassword}
                    onClose={() => setSelectedInstructor(null)}
                />
            )}
        </div>
    );
};

export default Applications;
