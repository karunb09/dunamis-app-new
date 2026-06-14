import React, { useEffect, useState, useRef } from "react";
import { FaSearch, FaFilter, FaSortAmountDown, FaPlus } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import DataTable from "../../components/Table";
import moment from "moment";
import { getAllNotices } from "../../redux/AdminNotice/AdminNoticeSlice";
import { PiX } from "react-icons/pi";
import { resolveImageUrl } from "../../utils/resolveImageUrl";

const SORT_OPTIONS = [
    { value: "date-asc", label: "Date Ascending" },
    { value: "date-desc", label: "Date Descending" },
    { value: "subject-asc", label: "Subject A-Z" },
    { value: "subject-desc", label: "Subject Z-A" },
    { value: "creator-asc", label: "Creator A-Z" },
    { value: "creator-desc", label: "Creator Z-A" },
];

const UpdatesPage = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const { notices, loading, error } = useSelector((state) => state.notice);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortOpen, setSortOpen] = useState(false);
    const [sortOption, setSortOption] = useState("");
    const [filterOpen, setFilterOpen] = useState(false);
    const [filters, setFilters] = useState({
        status: "",
        sentTo: "",
        dateFrom: "",
        dateTo: "",
    });

    const sortRef = useRef(null);

    useEffect(() => {
        dispatch(getAllNotices());
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

    const getImageUrl = (imagePath) => resolveImageUrl(imagePath, "/profile-photo.png");

    const formattedUpdates = (notices || []).map((n) => ({
        id: n._id,
        date: moment(n.createdAt).format("hh:mm A, DD MMM YYYY"),
        dateRaw: n.createdAt,
        creator: `${n.creator?.name?.firstName || ""} ${n.creator?.name?.lastName || ""}`.trim(),
        avatar: getImageUrl(n.creator?.image),
        subject: n.title,
        message: n.message,
        sentTo: n.targetUsers,
        status: n.status,
        type: n.sentAt ? moment(n.sentAt).format("hh:mm A, DD MMM YYYY") : "--",
    }));

    // Apply search filter
    let filteredUpdates = formattedUpdates.filter((update) =>
        Object.values(update).join(" ").toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Apply filters
    if (filters.status) {
        filteredUpdates = filteredUpdates.filter(
            (update) => update.status?.toLowerCase() === filters.status.toLowerCase()
        );
    }

    if (filters.sentTo) {
        filteredUpdates = filteredUpdates.filter(
            (update) => update.sentTo?.toLowerCase() === filters.sentTo.toLowerCase()
        );
    }

    if (filters.dateFrom) {
        filteredUpdates = filteredUpdates.filter(
            (update) => new Date(update.dateRaw) >= new Date(filters.dateFrom)
        );
    }

    if (filters.dateTo) {
        filteredUpdates = filteredUpdates.filter(
            (update) => new Date(update.dateRaw) <= new Date(filters.dateTo)
        );
    }

    // Apply sorting
    const sortedUpdates = [...filteredUpdates];

    if (sortOption) {
        switch (sortOption) {
            case "date-asc":
                sortedUpdates.sort((a, b) => new Date(a.dateRaw) - new Date(b.dateRaw));
                break;
            case "date-desc":
                sortedUpdates.sort((a, b) => new Date(b.dateRaw) - new Date(a.dateRaw));
                break;
            case "subject-asc":
                sortedUpdates.sort((a, b) => (a.subject || "").localeCompare(b.subject || ""));
                break;
            case "subject-desc":
                sortedUpdates.sort((a, b) => (b.subject || "").localeCompare(a.subject || ""));
                break;
            case "creator-asc":
                sortedUpdates.sort((a, b) => (a.creator || "").localeCompare(b.creator || ""));
                break;
            case "creator-desc":
                sortedUpdates.sort((a, b) => (b.creator || "").localeCompare(a.creator || ""));
                break;
            default:
                break;
        }
    }

    const handleFilterChange = (field, value) => {
        setFilters((prev) => ({ ...prev, [field]: value }));
    };

    const clearFilters = () => {
        setFilters({
            status: "",
            sentTo: "",
            dateFrom: "",
            dateTo: "",
        });
    };

    // Get unique values for filter dropdowns
    const uniqueStatuses = [...new Set(notices?.map((n) => n.status).filter(Boolean))];
    const uniqueSentTo = [...new Set(notices?.map((n) => n.targetUsers).filter(Boolean))];

    const columns = [
        {
            key: "date",
            header: "Date & Time",
            className: "text-sm text-gray-600",
        },
        {
            key: "creator",
            header: "Creator",
            render: (value, row) => (
                <div className="flex items-center gap-2.5">
                    <img
                        src={row.avatar}
                        alt={row.creator}
                        className="w-9 h-9 rounded-full object-cover object-top border border-gray-200"
                        onError={(e) => {
                            e.target.src = "/profile-photo.png";
                        }}
                    />
                    <span className="font-medium text-gray-900">{row.creator}</span>
                </div>
            ),
        },
        {
            key: "subject",
            header: "Subject",
            className: "font-medium text-gray-900",
        },
        {
            key: "message",
            header: "Message",
            className: "text-sm text-gray-600 max-w-md truncate",
        },
        {
            key: "sentTo",
            header: "Sent to",
            render: (value) => (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                    {value}
                </span>
            ),
        },
        {
            key: "status",
            header: "Status",
            render: (value) => (
                <span
                    className={`inline-flex items-center gap-1.5 text-sm font-medium ${value === "Sent" ? "text-green-600" : "text-gray-500"
                        }`}
                >
                    <span className="w-2 h-2 rounded-full bg-current"></span>
                    {value}
                </span>
            ),
        },
        {
            key: "type",
            header: "Type",
            className: "text-sm text-gray-600",
        },
    ];

    return (
        <div className="p-6 bg-white min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div className="relative w-full md:w-1/3">
                    <input
                        type="text"
                        placeholder="Search updates..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                    />
                    <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Sort Dropdown */}
                    <div className="relative" ref={sortRef}>
                        <button
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition"
                            onClick={() => setSortOpen(!sortOpen)}
                        >
                            <FaSortAmountDown className="text-sm" />
                            Sort
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

                    {/* Filter Button */}
                    <button
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition"
                        onClick={() => setFilterOpen(true)}
                    >
                        <FaFilter className="text-sm" />
                        Filter
                    </button>

                    <button
                        onClick={() => navigate("/admin/updates/create-updates")}
                        className="flex items-center gap-2 px-4 py-2.5 bg-black text-white text-sm font-medium rounded-2xl hover:bg-gray-800 transition"
                    >
                        <FaPlus className="text-sm" />
                        Create Update
                    </button>
                </div>
            </div>

            {/* Filter Modal */}
            {filterOpen && (
                <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black bg-opacity-40 px-3 py-4 backdrop-blur-sm sm:items-center sm:px-4">
                    <div className="relative my-auto max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-lg bg-white p-4 sm:p-6">
                        <button
                            onClick={() => setFilterOpen(false)}
                            className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-xl font-bold"
                        >
                            <PiX />
                        </button>
                        <h2 className="text-xl font-semibold mb-4">Filter Updates</h2>

                        {/* Status Filter */}
                        <label className="block mb-2 font-medium">Status</label>
                        <select
                            value={filters.status}
                            onChange={(e) => handleFilterChange("status", e.target.value)}
                            className="w-full mb-4 border rounded px-3 py-2"
                        >
                            <option value="">All Status</option>
                            {uniqueStatuses.map((status) => (
                                <option key={status} value={status}>
                                    {status}
                                </option>
                            ))}
                        </select>

                        {/* Sent To Filter */}
                        <label className="block mb-2 font-medium">Sent To</label>
                        <select
                            value={filters.sentTo}
                            onChange={(e) => handleFilterChange("sentTo", e.target.value)}
                            className="w-full mb-4 border rounded px-3 py-2"
                        >
                            <option value="">All Recipients</option>
                            {uniqueSentTo.map((recipient) => (
                                <option key={recipient} value={recipient}>
                                    {recipient}
                                </option>
                            ))}
                        </select>

                        {/* Date Range */}
                        <label className="block mb-2 font-medium">Date From</label>
                        <input
                            type="date"
                            value={filters.dateFrom}
                            onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                            className="w-full mb-4 border rounded px-3 py-2"
                        />

                        <label className="block mb-2 font-medium">Date To</label>
                        <input
                            type="date"
                            value={filters.dateTo}
                            onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                            className="w-full mb-4 border rounded px-3 py-2"
                        />

                        {/* Buttons */}
                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between mt-6">
                            <button
                                className="px-4 py-2 rounded-2xl border hover:bg-gray-200"
                                onClick={clearFilters}
                            >
                                Clear Filters
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
                data={sortedUpdates}
                columns={columns}
                itemsPerPage={10}
                selectable={false}
                emptyMessage={
                    loading
                        ? "Loading updates..."
                        : error
                            ? "Failed to load updates."
                            : "No updates found."
                }
            />
        </div>
    );
};

export default UpdatesPage;
