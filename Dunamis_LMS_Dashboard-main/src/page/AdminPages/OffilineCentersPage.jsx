import React, { useEffect, useRef, useState } from "react";
import { FaFilter, FaSearch, FaSortAmountDown, FaMapMarkerAlt, FaClock, FaUsers, FaCity } from "react-icons/fa";
import { FiEdit2, FiTrash2, FiX, FiMoreVertical } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchAllBranches, deleteBranch } from "../../redux/Branch/branchSlice";
import Swal from "sweetalert2";
import toast from "react-hot-toast";
import { resolveImageUrl } from "../../utils/resolveImageUrl";
import PageTabBar from "../../components/PageTabBar";
import DataCards from "../../components/DataCards";

const TABS = ["Active", "Drafts"];
const SORT_OPTIONS = [
    { value: "name-asc", label: "Name A-Z" },
    { value: "name-desc", label: "Name Z-A" },
    { value: "createdAt-asc", label: "Created At Asc" },
    { value: "createdAt-desc", label: "Created At Desc" },
];

const slugify = (text) => (text || "").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

const getBranchFallbackImage = (branchName = "Branch") =>
    `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(branchName)}`;

const getBranchCityName = (branch) =>
    branch?.city?.cityName || branch?.city?.name || "City not assigned";

const getBranchTimings = (branch) =>
    Array.isArray(branch?.branchTimings) && branch.branchTimings.length === 2
        ? branch.branchTimings.join(" - ")
        : "Hours not set";

const BranchCard = ({ branch, selected, onSelect, onView, onEdit, onDelete }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
        };
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, []);

    return (
        <div
            className={`group flex flex-col overflow-hidden rounded-[24px] border bg-white shadow-[0_4px_16px_-8px_rgba(15,23,42,0.10)] transition-shadow hover:shadow-[0_12px_32px_-8px_rgba(15,23,42,0.16)] ${
                selected ? "border-orange-300 ring-1 ring-orange-200" : "border-slate-200"
            }`}
        >
            <div className="relative h-40 bg-slate-100">
                <img
                    src={resolveImageUrl(branch.branchImage, getBranchFallbackImage(branch.branchName || "Branch"))}
                    alt={branch.branchName || "Branch"}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

                <input
                    type="checkbox"
                    checked={selected}
                    onChange={onSelect}
                    className="absolute left-4 top-4 z-10 h-4 w-4 cursor-pointer rounded border-white/60 accent-orange-500"
                    aria-label={`Select ${branch.branchName || "branch"}`}
                />

                <div className="absolute right-3 top-3 z-10" ref={menuRef}>
                    <button
                        type="button"
                        onClick={() => setMenuOpen((o) => !o)}
                        aria-label="More actions"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-sm transition hover:bg-white hover:text-slate-900"
                    >
                        <FiMoreVertical size={16} />
                    </button>
                    {menuOpen && (
                        <div className="absolute right-0 mt-2 w-40 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-lg shadow-slate-200/50">
                            <button
                                type="button"
                                onClick={() => { setMenuOpen(false); onEdit(); }}
                                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                                <FiEdit2 size={13} /> Edit
                            </button>
                            <button
                                type="button"
                                onClick={() => { setMenuOpen(false); onDelete(); }}
                                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                            >
                                <FiTrash2 size={13} /> Delete
                            </button>
                        </div>
                    )}
                </div>

                <span
                    className={`absolute bottom-3 left-4 z-10 rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ${
                        branch.status === "active"
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                            : "bg-amber-50 text-amber-700 ring-amber-200"
                    }`}
                >
                    {branch.status || "draft"}
                </span>
            </div>

            <div className="flex flex-1 flex-col p-5">
                <h3 className="truncate text-base font-semibold text-slate-900">
                    {branch.branchName || "Unnamed Branch"}
                </h3>
                <p className="mt-1 flex items-start gap-2 text-sm text-slate-500">
                    <FaMapMarkerAlt className="mt-0.5 shrink-0 text-slate-400" size={12} />
                    <span className="line-clamp-2">{branch.location || "Location not available"}</span>
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2.5">
                    <div className="rounded-2xl bg-slate-50/70 px-3 py-2.5">
                        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            <FaCity size={11} /> City
                        </p>
                        <p className="mt-0.5 truncate text-xs font-medium text-slate-700">{getBranchCityName(branch)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50/70 px-3 py-2.5">
                        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            <FaUsers size={11} /> Capacity
                        </p>
                        <p className="mt-0.5 truncate text-xs font-medium text-slate-700">{branch.branchCapacity || "N/A"}</p>
                    </div>
                    <div className="col-span-2 rounded-2xl bg-slate-50/70 px-3 py-2.5">
                        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            <FaClock size={11} /> Timings
                        </p>
                        <p className="mt-0.5 truncate text-xs font-medium text-slate-700">{getBranchTimings(branch)}</p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onView}
                    className="mt-5 w-full rounded-2xl bg-[#FF6B35] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#fd5a1f]"
                >
                    View Details
                </button>
            </div>
        </div>
    );
};

const OfflineCentersPage = () => {
    const [activeTab, setActiveTab] = useState("Active");
    const [searchTerm, setSearchTerm] = useState("");
    const [filterOpen, setFilterOpen] = useState(false);
    const [sortOpen, setSortOpen] = useState(false);
    const [sortOption, setSortOption] = useState("");
    const [filters, setFilters] = useState({ city: "", zone: "" });

    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { branches, loading, error, listStatus: branchListStatus } = useSelector((state) => state.branch);

    const dropdownRef = useRef(null);

    useEffect(() => {
        if (branchListStatus === "idle") {
            dispatch(fetchAllBranches());
        }
    }, [branchListStatus, dispatch]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setSortOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleDeleteSingle = (id) => {
        Swal.fire({
            title: "Are you sure?",
            text: "You won't be able to revert this!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#FF6B35",
            cancelButtonColor: "#dc2626",
            confirmButtonText: "Yes, delete it!",
        }).then((result) => {
            if (result.isConfirmed) {
                dispatch(deleteBranch(id))
                    .unwrap()
                    .then(() => {
                        toast.success("Branch deleted successfully");
                        dispatch(fetchAllBranches());
                    })
                    .catch((err) => toast.error("Failed to delete branch: " + err));
            }
        });
    };

    const handleDeleteMultiple = (selectedIds) => {
        if (!selectedIds.length) return;
        Swal.fire({
            title: "Are you sure?",
            text: "You won't be able to revert this!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#FF6B35",
            cancelButtonColor: "#dc2626",
            confirmButtonText: "Yes, delete it!",
        }).then((result) => {
            if (result.isConfirmed) {
                Promise.all(selectedIds.map((id) => dispatch(deleteBranch(id)).unwrap()))
                    .then(() => {
                        toast.success(`${selectedIds.length} branch(es) deleted successfully`);
                        dispatch(fetchAllBranches());
                    })
                    .catch((err) => toast.error("Failed to delete some branches: " + err));
            }
        });
    };

    let filteredBranches = branches
        .filter((branch) => {
            if (activeTab === "Active") return branch.status === "active";
            if (activeTab === "Drafts") return branch.status === "draft";
            return true;
        })
        .filter((branch) =>
            (branch.branchName || "").toLowerCase().includes(searchTerm.toLowerCase())
        )
        .filter((branch) => {
            if (filters.city && branch.city?.cityName !== filters.city) return false;
            if (filters.zone && branch.zone !== filters.zone) return false;
            return true;
        });

    if (sortOption) {
        switch (sortOption) {
            case "name-asc":
                filteredBranches.sort((a, b) => (a.branchName || "").localeCompare(b.branchName || ""));
                break;
            case "name-desc":
                filteredBranches.sort((a, b) => (b.branchName || "").localeCompare(a.branchName || ""));
                break;
            case "createdAt-asc":
                filteredBranches.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                break;
            case "createdAt-desc":
                filteredBranches.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
        }
    }

    const uniqueCities = [
        ...new Map(branches.map((b) => b.city).filter(Boolean).map((c) => [c._id, c])).values(),
    ];

    return (
        <div>
            {/* Header */}
            <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">Offline Centers</p>
                <h1 className="mt-1 text-2xl font-bold text-slate-900">Branches</h1>
                <p className="mt-1 text-sm text-slate-500">Manage physical centers, their timings, capacity and location.</p>
            </div>

            {/* Tabs */}
            <div className="mb-5">
                <PageTabBar tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
            </div>

            {/* Toolbar */}
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:w-72">
                    <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                    <input
                        type="text"
                        placeholder="Search branches…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => navigate("/admin/centers/add-branch")}
                        className="inline-flex items-center gap-2 rounded-2xl bg-[#FF6B35] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#fd5a1f]"
                    >
                        Add Branch
                    </button>
                    <div className="relative" ref={dropdownRef}>
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
                            Object.values(filters).some(Boolean)
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
                        <h2 className="mt-1 text-lg font-bold text-slate-900">Filter Branches</h2>

                        <div className="mt-5">
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">City</label>
                            <select
                                value={filters.city}
                                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                            >
                                <option value="">All Cities</option>
                                {uniqueCities.map((city) => (
                                    <option key={city._id} value={city.cityName}>{city.cityName}</option>
                                ))}
                            </select>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setFilters({ city: "", zone: "" })}
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

            {loading && <p className="py-10 text-center text-slate-500">Loading branches…</p>}
            {error && <p className="py-10 text-center text-rose-600">{error}</p>}

            {!loading && (
                <DataCards
                    data={filteredBranches}
                    itemsPerPage={12}
                    emptyMessage="No branches found."
                    onDeleteSelected={(selectedIds) => handleDeleteMultiple(selectedIds)}
                    bulkDeleteLabel="Delete branches"
                    renderCard={(branch, { selected, onSelect }) => (
                        <BranchCard
                            branch={branch}
                            selected={selected}
                            onSelect={onSelect}
                            onView={() => navigate(`/admin/centers/${slugify(branch._id)}`, { state: { branch } })}
                            onEdit={() => navigate(`/admin/centers/edit-branch/${branch._id}`)}
                            onDelete={() => handleDeleteSingle(branch._id)}
                        />
                    )}
                />
            )}
        </div>
    );
};

export default OfflineCentersPage;
