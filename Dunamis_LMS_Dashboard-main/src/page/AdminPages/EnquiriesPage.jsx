import React, { useEffect, useState, useRef } from "react";
import { FaSearch, FaFilter, FaSortAmountDown } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import {
    assignEnquiry,
    getAllEnquiries,
    respondEnquiry,
} from "../../redux/Enquiry/EnquirySlice";
import {
    getAllCallbackRequests,
    updateCallbackRequestStatus,
} from "../../redux/CallbackRequest/CallbackRequestSlice";
import { fetchAdmins } from "../../redux/Admin/AdminSlice";
import { FiX } from "react-icons/fi";
import DataCards from "../../components/DataCards";
import PersonCard from "../../components/cards/PersonCard";
import PageTabBar from "../../components/PageTabBar";

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

const statusBadgeClasses = {
    new: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
    "in-progress": "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    resolved: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    archived: "bg-slate-100 text-slate-600",
};

const callbackStatusBadgeClasses = {
    new: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
    contacted: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    closed: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
};

const TABS = ["General Enquiries", "Callback Requests"];

const EnquiriesPage = () => {
    const dispatch = useDispatch();
    const { enquiries, loading, error } = useSelector((state) => state.enquiry);
    const { admins } = useSelector((state) => state.admin);
    const {
        callbackRequests,
        loading: callbackLoading,
        error: callbackError,
    } = useSelector((state) => state.callbackRequest);

    const [activeTab, setActiveTab] = useState("General Enquiries");
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

    useEffect(() => {
        dispatch(getAllEnquiries());
        dispatch(fetchAdmins());
        dispatch(getAllCallbackRequests());
    }, [dispatch]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false);
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
            if (assignTo) dispatch(assignEnquiry({ id: selectedEnquiry._id, adminId: assignTo }));
            if (response.trim()) dispatch(respondEnquiry({ id: selectedEnquiry._id, message: response }));
        }
        closeModal();
    };

    let filteredData = enquiries.filter((item) =>
        item.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (statusFilter) {
        filteredData = filteredData.filter(
            (item) => item.status?.toLowerCase() === statusFilter.toLowerCase()
        );
    }

    if (sortOption) {
        switch (sortOption) {
            case "name-asc": filteredData.sort((a, b) => (a.name || "").localeCompare(b.name || "")); break;
            case "name-desc": filteredData.sort((a, b) => (b.name || "").localeCompare(a.name || "")); break;
            case "date-asc": filteredData.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); break;
            case "date-desc": filteredData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
        }
    }

    return (
        <div className="min-h-screen bg-slate-50/40 p-6">
            {/* Page header */}
            <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">Support</p>
                <h1 className="mt-1 text-2xl font-bold text-slate-900">Enquiries</h1>
                <p className="mt-0.5 text-sm text-slate-500">Manage and respond to incoming enquiries.</p>
            </div>

            <div className="mb-5">
                <PageTabBar tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
            </div>

            {activeTab === "General Enquiries" && (
            <>
            {/* Toolbar */}
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:w-72">
                    <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                    <input
                        type="text"
                        placeholder="Search by name…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2">
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
                            statusFilter
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
                        <h2 className="mt-1 text-lg font-bold text-slate-900">Filter Enquiries</h2>

                        <div className="mt-5">
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Status</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                            >
                                <option value="">All Status</option>
                                {FILTER_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setStatusFilter("")}
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

            {loading ? (
                <div className="rounded-[30px] border border-slate-200 bg-white px-6 py-16 text-center">
                    <p className="text-sm text-slate-500">Loading enquiries…</p>
                </div>
            ) : error ? (
                <div className="rounded-[30px] border border-rose-200 bg-rose-50 px-6 py-8 text-center">
                    <p className="text-sm text-rose-600">Error: {error}</p>
                </div>
            ) : (
                <DataCards
                    data={filteredData}
                    selectable={false}
                    itemsPerPage={12}
                    emptyMessage="No enquiries found."
                    renderCard={(row) => {
                        const assignedName = row.assignedTo?.userId?.name
                            ? `${row.assignedTo.userId.name.firstName} ${row.assignedTo.userId.name.lastName}`
                            : "Unassigned";

                        return (
                            <PersonCard
                                avatarSrc={row.avatar || undefined}
                                name={row.name || "Unknown"}
                                subtitle={row.email}
                                statusBadge={
                                    row.status
                                        ? {
                                            label: row.status.charAt(0).toUpperCase() + row.status.slice(1).replace("-", " "),
                                            className: statusBadgeClasses[row.status] || "bg-slate-100 text-slate-600",
                                            dot: true,
                                            dotClass: "bg-current",
                                          }
                                        : undefined
                                }
                                meta={[
                                    { label: "Subject", value: row.subject || "N/A" },
                                    { label: "Date", value: new Date(row.createdAt).toLocaleDateString() },
                                    { label: "Assigned To", value: assignedName },
                                    { label: "Response", value: row.response?.message || "—" },
                                ]}
                                onView={() => openModal(row)}
                                primaryLabel="Respond"
                            >
                                {/* Message preview */}
                                {row.message && (
                                    <div className="pb-1">
                                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Message</p>
                                        <p className="line-clamp-2 text-xs text-slate-600">{row.message}</p>
                                    </div>
                                )}
                            </PersonCard>
                        );
                    }}
                />
            )}
            </>
            )}

            {activeTab === "Callback Requests" && (
                callbackLoading ? (
                    <div className="rounded-[30px] border border-slate-200 bg-white px-6 py-16 text-center">
                        <p className="text-sm text-slate-500">Loading callback requests…</p>
                    </div>
                ) : callbackError ? (
                    <div className="rounded-[30px] border border-rose-200 bg-rose-50 px-6 py-8 text-center">
                        <p className="text-sm text-rose-600">Error: {callbackError}</p>
                    </div>
                ) : (
                    <DataCards
                        data={callbackRequests}
                        selectable={false}
                        itemsPerPage={12}
                        emptyMessage="No callback requests yet."
                        renderCard={(row) => (
                            <PersonCard
                                name={row.name || "Unknown"}
                                subtitle={row.phone}
                                statusBadge={{
                                    label: row.status.charAt(0).toUpperCase() + row.status.slice(1),
                                    className: callbackStatusBadgeClasses[row.status] || "bg-slate-100 text-slate-600",
                                    dot: true,
                                    dotClass: "bg-current",
                                }}
                                meta={[
                                    { label: "Course", value: row.courseId?.name || "N/A" },
                                    { label: "Preferred Time", value: row.preferredTime || "Any" },
                                    { label: "Requested", value: new Date(row.createdAt).toLocaleDateString() },
                                ]}
                                menuItems={[
                                    {
                                        label: "Mark Contacted",
                                        disabled: row.status === "contacted",
                                        onClick: () => dispatch(updateCallbackRequestStatus({ id: row._id, status: "contacted" })),
                                    },
                                    {
                                        label: "Mark Closed",
                                        disabled: row.status === "closed",
                                        onClick: () => dispatch(updateCallbackRequestStatus({ id: row._id, status: "closed" })),
                                    },
                                ]}
                            />
                        )}
                    />
                )
            )}

            {/* Assign & Respond Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-3 py-4 sm:items-center sm:px-4">
                    <div className="my-auto w-full max-w-sm overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
                        <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">Enquiry</p>
                        <h3 className="mt-1 text-lg font-bold text-slate-900">Assign & Respond</h3>

                        <div className="mt-5 mb-4">
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Assign To</label>
                            <select
                                value={assignTo}
                                onChange={(e) => setAssignTo(e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                            >
                                <option value="">Select admin</option>
                                {admins?.map((admin) => (
                                    <option key={admin._id} value={admin._id}>
                                        {admin.userId?.name?.firstName} {admin.userId?.name?.lastName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="mb-4">
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Response</label>
                            <textarea
                                value={response}
                                onChange={(e) => setResponse(e.target.value)}
                                rows={4}
                                placeholder="Enter your response here"
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="flex-1 rounded-2xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={saveChanges}
                                className="flex-1 rounded-2xl bg-[#FF6B35] py-2.5 text-sm font-semibold text-white transition hover:bg-[#fd5a1f]"
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
