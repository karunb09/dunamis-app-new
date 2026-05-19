import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import DataTable from "../../../../components/Table";
import {
    deleteApplication,
    fetchAllApplications,
    updateApplicationStatus,
} from "../../../../redux/Intructor/teacherApplication";
import CredentialModal from "./CredentialModal";
import { FaArrowRight, FaEye, FaFilter, FaSearch, FaSortAmountDown, FaTrash } from "react-icons/fa";
import { X } from "react-feather";

const SORT_OPTIONS = [
    { value: "name-asc", label: "Name A-Z" },
    { value: "name-desc", label: "Name Z-A" },
    { value: "createdAt-asc", label: "Application Date Asc" },
    { value: "createdAt-desc", label: "Application Date Desc" },
];

const STATUS_OPTIONS = ["new", "shortlisted", "interviewed", "selected", "rejected"];

const getFullName = (name) =>
    typeof name === "object"
        ? `${name?.firstName || ""} ${name?.lastName || ""}`.trim()
        : name || "Unknown";

const getInitials = (name) =>
    name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || "")
        .join("") || "NA";

const statusClasses = {
    new: "border-sky-200 bg-sky-50 text-sky-700",
    shortlisted: "border-amber-200 bg-amber-50 text-amber-700",
    interviewed: "border-violet-200 bg-violet-50 text-violet-700",
    selected: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rejected: "border-rose-200 bg-rose-50 text-rose-700",
};

const modeClasses = {
    online: "bg-emerald-50 text-emerald-700",
    offline: "bg-slate-100 text-slate-700",
};

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
    const [deletingApplicationId, setDeletingApplicationId] = useState("");
    const dropdownRef = useRef(null);
    const activeFilterCount = [filters.status, filters.mode].filter(Boolean).length;

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

    const handleStatusChange = async (id, newStatus) => {
        const selectedApp = allApplications.find((app) => app._id === id);
        const result = await dispatch(updateApplicationStatus({ id, status: newStatus }));

        if (result.meta.requestStatus === "rejected") {
            toast.error(result.payload || "Failed to update application status.");
            return;
        }

        if (newStatus === "selected" && selectedApp && result.meta.requestStatus === "fulfilled") {
            const password = result.payload?.generatedPassword;

            if (!password) {
                toast.success("Instructor account is ready.");
                return;
            }

            setGeneratedPassword(password);
            setSelectedInstructor(selectedApp);
        }
    };

    const handleRowClick = (row) => navigate(`/applications/${row._id}`);
    const clearFilters = () => setFilters({ status: "", mode: "" });

    const handleDeleteApplication = async (row) => {
        const fullName = getFullName(row?.name);
        const linkedWarning =
            row?.status === "selected"
                ? "\n\nIf this application is already linked to an instructor, delete will be blocked. Delete the instructor from the Instructor tab instead."
                : "";

        const confirmed = window.confirm(
            `Delete application for ${fullName}? This cannot be undone.${linkedWarning}`
        );

        if (!confirmed) return;

        setDeletingApplicationId(row._id);
        try {
            await dispatch(deleteApplication(row._id)).unwrap();
            toast.success("Application deleted successfully.");
        } catch (deleteError) {
            toast.error(deleteError || "Failed to delete application.");
        } finally {
            setDeletingApplicationId("");
        }
    };

    const stats = [
        {
            label: "Total Applications",
            value: allApplications.length,
            tone: "from-slate-900 to-slate-700 text-white",
        },
        {
            label: "New",
            value: allApplications.filter((app) => app.status === "new").length,
            tone: "from-sky-100 to-white text-slate-900",
        },
        {
            label: "Shortlisted",
            value: allApplications.filter((app) => app.status === "shortlisted").length,
            tone: "from-amber-100 to-white text-slate-900",
        },
        {
            label: "Selected",
            value: allApplications.filter((app) => app.status === "selected").length,
            tone: "from-emerald-100 to-white text-slate-900",
        },
    ];

    const columns = [
        {
            key: "mockId",
            header: "Application ID",
            render: (value) => (
                <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                    {value}
                </span>
            ),
        },
        {
            key: "name",
            header: "Instructor",
            render: (value, row) => {
                const fullName = getFullName(row?.name);
                return (
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFD9C7] to-[#FFF1EB] text-sm font-semibold text-[#FF6B35]">
                            {getInitials(fullName)}
                        </div>
                        <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">{fullName}</p>
                            <p className="truncate text-xs text-slate-500">{row.email}</p>
                        </div>
                    </div>
                );
            },
        },
        {
            key: "areaOfExpertise",
            header: "Specialization",
            render: (value) => (
                <span className="inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-[#FF6B35]">
                    {value || "Not set"}
                </span>
            ),
        },
        {
            key: "yearOfExperience",
            header: "Experience",
            render: (value) => (
                <span className="font-medium text-slate-700">
                    {value ? `${value} years` : "Not provided"}
                </span>
            ),
        },
        {
            key: "mode",
            header: "Mode",
            render: (value) => (
                <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                        modeClasses[value] || "bg-slate-100 text-slate-700"
                    }`}
                >
                    {value || "N/A"}
                </span>
            ),
        },
        {
            key: "createdAt",
            header: "Application Time & Date",
            render: (value) => (
                <div>
                    <p className="font-medium text-slate-800">
                        {new Date(value).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-slate-500">
                        {new Date(value).toLocaleTimeString()}
                    </p>
                </div>
            ),
        },
        {
            key: "status",
            header: "Status",
            render: (value, row) => (
                <select
                    value={row.status}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => handleStatusChange(row._id, e.target.value)}
                    className={`rounded-full border px-3 py-2 text-sm font-medium capitalize shadow-sm outline-none transition focus:ring-2 focus:ring-offset-1 ${
                        statusClasses[row.status] || "border-slate-200 bg-white text-slate-700"
                    }`}
                >
                    {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                            {status}
                        </option>
                    ))}
                </select>
            ),
        },
        {
            key: "actions",
            header: "Actions",
            render: (_, row) => (
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(row);
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                    >
                        <FaEye className="text-xs" />
                        Review
                        <FaArrowRight className="text-[10px]" />
                    </button>
                    <button
                        type="button"
                        disabled={deletingApplicationId === row._id}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteApplication(row);
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <FaTrash className="text-xs" />
                        {deletingApplicationId === row._id ? "Deleting..." : "Delete"}
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="p-4">
            {loading ? (
                <p>Loading applications...</p>
            ) : (
                <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {stats.map((item) => (
                            <div
                                key={item.label}
                                className={`rounded-[28px] border border-slate-200 bg-gradient-to-br ${item.tone} px-5 py-5 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)]`}
                            >
                                <p className="text-sm font-medium opacity-80">{item.label}</p>
                                <p className="mt-3 text-3xl font-semibold">{item.value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)]">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                            <div className="relative w-full xl:max-w-md">
                            <input
                                type="text"
                                placeholder="Search by instructor, email, or application ID"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-200"
                            />
                                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <div className="relative" ref={dropdownRef}>
                                    <button
                                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-3 text-sm font-medium transition ${
                                            sortOpen || sortOption
                                                ? "border-slate-900 bg-slate-900 text-white"
                                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                                        }`}
                                        onClick={() => setSortOpen(!sortOpen)}
                                    >
                                        <FaSortAmountDown />
                                        {sortOption
                                            ? SORT_OPTIONS.find((item) => item.value === sortOption)?.label
                                            : "Sort"}
                                    </button>
                                    {sortOpen && (
                                        <ul className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                                            {SORT_OPTIONS.map(({ value, label }) => (
                                                <li
                                                    key={value}
                                                    className={`cursor-pointer rounded-xl px-4 py-3 text-sm font-medium transition hover:bg-slate-50 ${
                                                        sortOption === value
                                                            ? "bg-slate-900 text-white hover:bg-slate-900"
                                                            : "text-slate-700"
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
                                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-3 text-sm font-medium transition ${
                                        filterOpen || activeFilterCount
                                            ? "border-[#FF6B35] bg-[#FFF3EE] text-[#FF6B35]"
                                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                                    }`}
                                    onClick={() => setFilterOpen(true)}
                                >
                                    <FaFilter />
                                    Filters
                                    {activeFilterCount ? (
                                        <span className="rounded-full bg-[#FF6B35] px-2 py-0.5 text-xs font-semibold text-white">
                                            {activeFilterCount}
                                        </span>
                                    ) : null}
                                </button>

                                {(searchTerm || sortOption || activeFilterCount) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchTerm("");
                                            setSortOption("");
                                            clearFilters();
                                        }}
                                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
                                    >
                                        Reset View
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {filterOpen && (
                        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black bg-opacity-40 px-3 py-4 backdrop-blur-sm sm:items-center sm:px-4">
                            <div className="relative my-auto max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-[24px] border border-slate-200 bg-white p-4 shadow-2xl sm:rounded-[30px] sm:p-6">
                                <button
                                    onClick={() => setFilterOpen(false)}
                                    className="absolute right-4 top-4 text-slate-400 transition hover:text-slate-700"
                                >
                                    <X />
                                </button>
                                <h2 className="text-xl font-semibold text-slate-900">Filter Applications</h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Narrow the table by status and teaching mode.
                                </p>

                                <label className="mt-6 block mb-2 text-sm font-semibold text-slate-700">Status</label>
                                <select
                                    value={filters.status}
                                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                                >
                                    <option value="">All</option>
                                    <option value="new">New</option>
                                    <option value="shortlisted">Shortlisted</option>
                                    <option value="interviewed">Interviewed</option>
                                    <option value="selected">Selected</option>
                                    <option value="rejected">Rejected</option>
                                </select>

                                <label className="mt-4 block mb-2 text-sm font-semibold text-slate-700">Mode</label>
                                <select
                                    value={filters.mode}
                                    onChange={(e) => setFilters({ ...filters, mode: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                                >
                                    <option value="">All</option>
                                    <option value="online">Online</option>
                                    <option value="offline">Offline</option>
                                </select>

                                <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <button
                                        className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                                        onClick={clearFilters}
                                    >
                                        Clear
                                    </button>
                                    <button
                                        className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
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
                        emptyMessage={
                            error
                                ? "Failed to load applications."
                                : "No applications match the current search and filters."
                        }
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
