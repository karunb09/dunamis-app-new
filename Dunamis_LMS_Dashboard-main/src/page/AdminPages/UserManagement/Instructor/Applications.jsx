import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import {
    deleteApplication,
    fetchAllApplications,
    updateApplicationStatus,
} from "../../../../redux/Intructor/teacherApplication";
import CredentialModal from "./CredentialModal";
import { FaFilter, FaSearch, FaSortAmountDown, FaTrash } from "react-icons/fa";
import { FiX } from "react-icons/fi";
import DataCards from "../../../../components/DataCards";
import PersonCard from "../../../../components/cards/PersonCard";
import SlideOver from "../../../../components/SlideOver";

const SORT_OPTIONS = [
    { value: "name-asc", label: "Name A-Z" },
    { value: "name-desc", label: "Name Z-A" },
    { value: "createdAt-asc", label: "Application Date Asc" },
    { value: "createdAt-desc", label: "Application Date Desc" },
];

const STATUS_OPTIONS = ["new", "shortlisted", "interviewed", "selected", "rejected"];

const statusBadgeClasses = {
    new: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
    shortlisted: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    interviewed: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
    selected: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    rejected: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
};

const statusSelectClasses = {
    new: "border-sky-200 bg-sky-50 text-sky-700",
    shortlisted: "border-amber-200 bg-amber-50 text-amber-700",
    interviewed: "border-violet-200 bg-violet-50 text-violet-700",
    selected: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rejected: "border-rose-200 bg-rose-50 text-rose-700",
};

const modeClasses = {
    online: "bg-emerald-50 text-emerald-700",
    offline: "bg-slate-100 text-slate-700",
    hybrid: "bg-purple-50 text-purple-700",
};

const getFullName = (name) =>
    typeof name === "object"
        ? `${name?.firstName || ""} ${name?.lastName || ""}`.trim()
        : name || "Unknown";

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
    const [assignedEmployeeId, setAssignedEmployeeId] = useState("");
    const [deletingApplicationId, setDeletingApplicationId] = useState("");
    const [slideOver, setSlideOver] = useState({ open: false, application: null });
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
        let employeePrefix;
        if (newStatus === "selected") {
            const { value: unit, isConfirmed } = await Swal.fire({
                title: "Assign employee unit",
                text: "The instructor's employee ID (e.g. DSMI001) is generated from this unit.",
                input: "select",
                inputOptions: { DSM: "DSM", DSD: "DSD", DCC: "DCC" },
                inputValue: "DSM",
                showCancelButton: true,
                confirmButtonText: "Assign & Select",
                confirmButtonColor: "#FF6B35",
            });
            if (!isConfirmed) return;
            employeePrefix = `${unit}I`;
        }
        const result = await dispatch(updateApplicationStatus({ id, status: newStatus, employeePrefix }));
        if (result.meta.requestStatus === "rejected") {
            toast.error(result.payload || "Failed to update application status.");
            return;
        }
        if (newStatus === "selected" && selectedApp && result.meta.requestStatus === "fulfilled") {
            const password = result.payload?.generatedPassword;
            const employeeId = result.payload?.employeeId || "";
            if (!password) {
                toast.success(employeeId ? `Instructor account is ready (${employeeId}).` : "Instructor account is ready.");
                return;
            }
            setGeneratedPassword(password);
            setAssignedEmployeeId(employeeId);
            setSelectedInstructor(selectedApp);
        }
    };

    const clearFilters = () => setFilters({ status: "", mode: "" });

    const handleDeleteApplication = async (row) => {
        const fullName = getFullName(row?.name);
        const linkedWarning =
            row?.status === "selected"
                ? "\n\nIf this application is already linked to an instructor, delete will be blocked. Delete the instructor from the Instructor tab instead."
                : "";
        const confirmed = window.confirm(`Delete application for ${fullName}? This cannot be undone.${linkedWarning}`);
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

    const closeSlideOver = () => setSlideOver((prev) => ({ ...prev, open: false }));

    const renderApplicationSlide = () => {
        const snap = slideOver.application;
        if (!snap) return null;
        const r = allApplications.find((a) => a._id === snap._id) || snap;
        const fullName = getFullName(r?.name);
        const initials = fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

        return (
            <>
                <div className="bg-gradient-to-b from-orange-50 to-white px-6 pb-6 pt-14">
                    <div className="flex items-start gap-4">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFD9C7] to-[#FFF1EB] text-xl font-bold text-[#FF6B35] ring-4 ring-white shadow-md">
                            {initials}
                        </div>
                        <div className="min-w-0 flex-1 pt-1">
                            <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">Instructor Application</p>
                            <h2 className="mt-0.5 truncate text-xl font-bold text-slate-900">{fullName}</h2>
                            <p className="truncate text-sm text-slate-500">{r.email}</p>
                        </div>
                        {r.status && (
                            <span className={`mt-1 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                                statusBadgeClasses[r.status] || "bg-slate-100 text-slate-600"
                            }`}>
                                {r.status}
                            </span>
                        )}
                    </div>
                </div>

                <div className="px-6 py-5">
                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Application Details</p>
                    <div className="space-y-2.5">
                        {[
                            { label: "App ID", value: snap.mockId || r._id?.slice(-6)?.toUpperCase() || "—" },
                            { label: "Experience", value: r.yearOfExperience ? `${r.yearOfExperience} years` : "—" },
                            { label: "Expertise", value: r.areaOfExpertise || "—" },
                            { label: "Mode", value: r.mode || "—" },
                            { label: "Applied", value: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—" },
                        ].map(({ label, value }) => (
                            <div key={label} className="flex items-baseline gap-3 text-sm">
                                <span className="w-20 shrink-0 text-slate-400">{label}</span>
                                <span className="break-all font-medium capitalize text-slate-900">{value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="border-t border-slate-100 px-6 py-5">
                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Update Status</p>
                    <select
                        value={r.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleStatusChange(r._id, e.target.value)}
                        className={`w-full rounded-2xl border px-4 py-2.5 text-sm font-medium capitalize outline-none transition focus:ring-2 focus:ring-orange-100 ${
                            statusSelectClasses[r.status] || "border-slate-200 bg-white text-slate-700"
                        }`}
                    >
                        {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                </div>
            </>
        );
    };

    const stats = [
        { label: "Total Applications", value: allApplications.length, tone: "from-slate-900 to-slate-700 text-white" },
        { label: "New", value: allApplications.filter((app) => app.status === "new").length, tone: "from-sky-100 to-white text-slate-900" },
        { label: "Shortlisted", value: allApplications.filter((app) => app.status === "shortlisted").length, tone: "from-amber-100 to-white text-slate-900" },
        { label: "Selected", value: allApplications.filter((app) => app.status === "selected").length, tone: "from-emerald-100 to-white text-slate-900" },
    ];

    return (
        <div className="p-4">
            {loading ? (
                <p className="py-10 text-center text-slate-500">Loading applications…</p>
            ) : (
                <div className="space-y-6">
                    {/* Stats */}
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

                    {/* Toolbar */}
                    <div className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)]">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                            <div className="relative w-full xl:max-w-md">
                                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by instructor, email, or application ID"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <div className="relative" ref={dropdownRef}>
                                    <button
                                        onClick={() => setSortOpen(!sortOpen)}
                                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-3 text-sm font-medium transition ${
                                            sortOpen || sortOption
                                                ? "border-orange-300 bg-orange-50 text-orange-700"
                                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                                        }`}
                                    >
                                        <FaSortAmountDown />
                                        {sortOption ? SORT_OPTIONS.find((item) => item.value === sortOption)?.label : "Sort"}
                                    </button>
                                    {sortOpen && (
                                        <ul className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                                            {SORT_OPTIONS.map(({ value, label }) => (
                                                <li
                                                    key={value}
                                                    className={`cursor-pointer rounded-xl px-4 py-3 text-sm font-medium transition hover:bg-slate-50 ${
                                                        sortOption === value ? "bg-orange-50 text-orange-700" : "text-slate-700"
                                                    }`}
                                                    onClick={() => { setSortOption(value); setSortOpen(false); }}
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
                                        onClick={() => { setSearchTerm(""); setSortOption(""); clearFilters(); }}
                                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
                                    >
                                        Reset View
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Filter modal */}
                    {filterOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
                            <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                                <button
                                    onClick={() => setFilterOpen(false)}
                                    className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                >
                                    <FiX size={18} />
                                </button>
                                <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">Filter</p>
                                <h2 className="mt-1 text-lg font-bold text-slate-900">Filter Applications</h2>
                                <p className="mt-0.5 text-sm text-slate-500">Narrow by status and teaching mode.</p>

                                <div className="mt-5 space-y-4">
                                    <div>
                                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Status</label>
                                        <select
                                            value={filters.status}
                                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                                        >
                                            <option value="">All</option>
                                            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Mode</label>
                                        <select
                                            value={filters.mode}
                                            onChange={(e) => setFilters({ ...filters, mode: e.target.value })}
                                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                                        >
                                            <option value="">All</option>
                                            <option value="online">Online</option>
                                            <option value="offline">Offline</option>
                                            <option value="hybrid">Hybrid</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="mt-8 flex gap-3">
                                    <button
                                        className="flex-1 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                                        onClick={clearFilters}
                                    >
                                        Clear
                                    </button>
                                    <button
                                        className="flex-1 rounded-full bg-[#FF6B35] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#fd5a1f]"
                                        onClick={() => setFilterOpen(false)}
                                    >
                                        Apply
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <DataCards
                        data={filteredApplications}
                        selectable={false}
                        itemsPerPage={12}
                        emptyMessage={error ? "Failed to load applications." : "No applications match the current search and filters."}
                        renderCard={(row) => {
                            const fullName = getFullName(row?.name);
                            return (
                                <PersonCard
                                    name={fullName}
                                    subtitle={row.email}
                                    statusBadge={
                                        row.status
                                            ? {
                                                label: row.status.charAt(0).toUpperCase() + row.status.slice(1),
                                                className: statusBadgeClasses[row.status] || "bg-slate-100 text-slate-600",
                                              }
                                            : undefined
                                    }
                                    meta={[
                                        { label: "App ID", value: row.mockId },
                                        { label: "Experience", value: row.yearOfExperience ? `${row.yearOfExperience} yrs` : "N/A" },
                                        { label: "Expertise", value: row.areaOfExpertise || "Not set" },
                                        {
                                            label: "Mode",
                                            value: row.mode,
                                            render: (v) => v ? (
                                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${modeClasses[v] || "bg-slate-100 text-slate-700"}`}>
                                                    {v}
                                                </span>
                                            ) : "N/A",
                                        },
                                    ]}
                                    onView={() => setSlideOver({ open: true, application: row })}
                                    primaryLabel="Review"
                                    menuItems={[
                                        {
                                            label: deletingApplicationId === row._id ? "Deleting…" : "Delete",
                                            icon: <FaTrash size={13} />,
                                            danger: true,
                                            disabled: deletingApplicationId === row._id,
                                            onClick: () => handleDeleteApplication(row),
                                        },
                                    ]}
                                >
                                    <div className="pb-1">
                                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Application Status</p>
                                        <select
                                            value={row.status}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => handleStatusChange(row._id, e.target.value)}
                                            className={`w-full rounded-xl border px-3 py-2 text-xs font-medium capitalize outline-none transition focus:ring-1 ${
                                                statusSelectClasses[row.status] || "border-slate-200 bg-white text-slate-700"
                                            }`}
                                        >
                                            {STATUS_OPTIONS.map((status) => (
                                                <option key={status} value={status}>{status}</option>
                                            ))}
                                        </select>
                                        <p className="mt-1.5 text-[10px] text-slate-400">
                                            Applied: {new Date(row.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </PersonCard>
                            );
                        }}
                    />
                </div>
            )}

            {selectedInstructor && (
                <CredentialModal
                    instructor={selectedInstructor}
                    password={generatedPassword}
                    employeeId={assignedEmployeeId}
                    onClose={() => { setSelectedInstructor(null); setAssignedEmployeeId(""); }}
                />
            )}

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
                                const id = slideOver.application?._id;
                                if (!id) return;
                                closeSlideOver();
                                navigate(`/applications/${id}`);
                            }}
                            className="flex-1 rounded-2xl bg-[#FF6B35] py-2.5 text-sm font-semibold text-white transition hover:bg-[#fd5a1f]"
                        >
                            Review Full Application →
                        </button>
                    </div>
                }
            >
                {renderApplicationSlide()}
            </SlideOver>
        </div>
    );
};

export default Applications;
