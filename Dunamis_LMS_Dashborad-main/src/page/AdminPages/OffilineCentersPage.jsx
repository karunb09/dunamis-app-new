import React, { useEffect, useState, useRef } from "react";
import { FaSearch, FaFilter, FaSortAmountDown, FaPlus, FaMapMarkerAlt, FaTrash, FaEllipsisV, FaClock, FaUsers, FaCity } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchAllBranches, deleteBranch } from "../../redux/Branch/branchSlice";
import { X } from "phosphor-react";
import Swal from "sweetalert2";
import toast from "react-hot-toast";
import { Menu } from "@headlessui/react";
import { resolveImageUrl } from "../../utils/resolveImageUrl";

const TABS = ["Active", "Drafts"];
const SORT_OPTIONS = [
    { value: "name-asc", label: "Name A-Z" },
    { value: "name-desc", label: "Name Z-A" },
    { value: "createdAt-asc", label: "Created At Asc" },
    { value: "createdAt-desc", label: "Created At Desc" },
];

const OfflineCentersPage = () => {
    const [activeTab, setActiveTab] = useState("Active");
    const [searchTerm, setSearchTerm] = useState("");
    const [filterOpen, setFilterOpen] = useState(false);
    const [sortOpen, setSortOpen] = useState(false);
    const [sortOption, setSortOption] = useState("");
    const [filters, setFilters] = useState({ city: "", zone: "" });
    const [selectedBranches, setSelectedBranches] = useState([]);

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

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setSelectedBranches([]);
    };

    // Single delete
    const handleDeleteSingle = (id) => {
        Swal.fire({
            title: "Are you sure?",
            text: `You won't be able to revert this!`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes, delete it!"
        }).then((result) => {
            if (result.isConfirmed) {
                dispatch(deleteBranch(id))
                    .unwrap()
                    .then(() => {
                        Swal.fire({
                            title: "Deleted!",
                            text: "Branch has been deleted.",
                            icon: "success"
                        });
                        toast.success("Branch deleted successfully");
                        dispatch(fetchAllBranches());
                    })
                    .catch((error) => toast.error("Failed to delete branch: " + error));
            }
        });
    };

    // Multiple delete
    const handleDeleteMultiple = () => {
        if (selectedBranches.length === 0) {
            toast.error("Please select at least one branch");
            return;
        }

        Swal.fire({
            title: "Are you sure?",
            text: `You won't be able to revert this!`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes, delete it!"
        }).then((result) => {
            if (result.isConfirmed) {
                const deletePromises = selectedBranches.map(id =>
                    dispatch(deleteBranch(id)).unwrap()
                );

                Promise.all(deletePromises)
                    .then(() => {
                        Swal.fire({
                            title: "Deleted!",
                            text: `${selectedBranches.length} branch(es) have been deleted.`,
                            icon: "success"
                        });
                        toast.success(`${selectedBranches.length} branch(es) deleted successfully`);
                        setSelectedBranches([]);
                        dispatch(fetchAllBranches());
                    })
                    .catch((error) => {
                        toast.error("Failed to delete some branches: " + error);
                    });
            }
        });
    };


    const handleSelectBranch = (id) => {
        setSelectedBranches(prev =>
            prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedBranches.length === filteredBranches.length) {
            setSelectedBranches([]);
        } else {
            setSelectedBranches(filteredBranches.map(b => b._id));
        }
    };

    // Filter & Sort logic
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

    const slugify = (text) =>
        (text || "").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    const getBranchFallbackImage = (branchName = "Branch") =>
        `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(branchName)}`;

    const getBranchCityName = (branch) =>
        branch?.city?.cityName || branch?.city?.name || "City not assigned";

    const getBranchTimings = (branch) =>
        Array.isArray(branch?.branchTimings) && branch.branchTimings.length === 2
            ? branch.branchTimings.join(" - ")
            : "Hours not set";

    const uniqueCities = [
        ...new Map(branches.map((b) => b.city).filter(Boolean).map((c) => [c._id, c])).values(),
    ];

    return (
        <div className="p-6 bg-white min-h-screen">
            {/* Tabs */}
            <div className="flex gap-6 border-b border-gray-300 mb-4">
                {TABS.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => handleTabChange(tab)}
                        className={`pb-2 text-sm font-medium ${activeTab === tab ? "border-b-2 border-black text-black" : "text-gray-500 hover:text-black"}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Search + Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div className="relative w-full md:w-1/3">
                    <input
                        type="text"
                        placeholder="Search branches..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-2xl border focus:outline-none focus:ring-2 focus:ring-black"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Select All */}
                    {filteredBranches.length > 0 && (
                        <button
                            onClick={handleSelectAll}
                            className="px-4 py-2 rounded-2xl border border-gray-300 text-sm bg-white hover:bg-gray-50"
                        >
                            {selectedBranches.length === filteredBranches.length ? "Deselect All" : "Select All"}
                        </button>
                    )}

                    {/* Delete Selected */}
                    {selectedBranches.length > 0 && (
                        <button
                            onClick={handleDeleteMultiple}
                            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gray-800 text-white hover:bg-gray-900 transition"
                        >
                            <FaTrash size={14} /> Delete ({selectedBranches.length})
                        </button>
                    )}

                    {/* Sort */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            className="flex items-center gap-1 px-4 py-2 rounded-2xl border border-black text-sm bg-white hover:bg-gray-100"
                            onClick={() => setSortOpen(!sortOpen)}
                        >
                            <FaSortAmountDown /> Sort
                        </button>
                        {sortOpen && (
                            <ul className="absolute z-40 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg text-sm">
                                {SORT_OPTIONS.map(({ value, label }) => (
                                    <li
                                        key={value}
                                        className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${sortOption === value ? "bg-gray-200 font-semibold" : ""}`}
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
                        className="flex items-center gap-1 px-4 py-2 rounded-2xl border border-black text-sm bg-white hover:bg-gray-100"
                        onClick={() => setFilterOpen(true)}
                    >
                        <FaFilter /> Filter
                    </button>

                    <button
                        onClick={() => navigate("/admin/centers/add-branch")}
                        className="flex items-center bg-black text-white gap-2 px-4 py-2 rounded-2xl hover:bg-gray-800"
                    >
                        <FaPlus /> Add Branch
                    </button>
                </div>
            </div>

            {/* Filter Modal */}
            {filterOpen && (
                <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black bg-opacity-40 px-3 py-4 backdrop-blur-sm sm:items-center sm:px-4">
                    <div className="relative my-auto max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-lg bg-white p-4 sm:p-6">
                        <button
                            onClick={() => setFilterOpen(false)}
                            className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
                        >
                            <X size={24} />
                        </button>
                        <h2 className="text-xl font-semibold mb-4">Filter Branches</h2>

                        <label className="block mb-2 font-medium">City</label>
                        <select
                            value={filters.city}
                            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                            className="w-full mb-4 border rounded px-3 py-2"
                        >
                            <option value="">All Cities</option>
                            {uniqueCities.map((city) => (
                                <option key={city._id} value={city.cityName}>
                                    {city.cityName}
                                </option>
                            ))}
                        </select>

                        <div className="flex justify-between mt-6">
                            <button
                                className="px-4 py-2 rounded-lg border bg-gray-100 hover:bg-gray-200"
                                onClick={() => setFilters({ city: "", zone: "" })}
                            >
                                Clear
                            </button>
                            <button
                                className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800"
                                onClick={() => setFilterOpen(false)}
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {loading && <p className="text-gray-500">Loading branches...</p>}
            {error && <p className="text-red-500">{error}</p>}

            {/* Branches Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {!loading && filteredBranches.length === 0 && (
                    <p className="text-gray-500 col-span-full">No branches found.</p>
                )}
                {!loading &&
                    filteredBranches.map((branch) => (
                        <div
                            key={branch._id}
                            className={`group overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl relative ${selectedBranches.includes(branch._id) ? "ring-2 ring-black" : ""
                                }`}
                        >
                            {/* Checkbox */}
                            <input
                                type="checkbox"
                                checked={selectedBranches.includes(branch._id)}
                                onChange={() => handleSelectBranch(branch._id)}
                                className="absolute top-4 left-4 z-20 cursor-pointer w-4 h-4 accent-black"
                                aria-label={`Select ${branch.branchName || "branch"}`}
                            />

                            {/* Three-dot menu */}
                            <Menu as="div" className="absolute top-4 right-4 z-20">
                                <Menu.Button className="p-2 bg-white/90 hover:bg-white rounded-full transition shadow-sm">
                                    <FaEllipsisV className="text-gray-700" />
                                </Menu.Button>
                                <Menu.Items className="absolute right-0 mt-2 w-36 bg-white border rounded-2xl shadow-xl z-30 overflow-hidden">
                                    <Menu.Item>
                                        {({ active }) => (
                                            <button
                                                onClick={() => navigate(`/admin/centers/edit-branch/${branch._id}`)}
                                                className={`w-full text-left px-4 py-2 text-sm ${active ? "bg-gray-100" : ""}`}
                                            >
                                                Edit
                                            </button>
                                        )}
                                    </Menu.Item>
                                    <Menu.Item>
                                        {({ active }) => (
                                            <button
                                                onClick={() => handleDeleteSingle(branch._id, branch.branchName)}
                                                className={`w-full text-left px-4 py-2 text-sm text-gray-700 ${active ? "bg-gray-100" : ""}`}
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </Menu.Item>
                                </Menu.Items>
                            </Menu>

                            <div className="relative h-44 bg-gray-100">
                                <img
                                    src={resolveImageUrl(
                                        branch.branchImage,
                                        getBranchFallbackImage(branch.branchName || "Branch")
                                    )}
                                    alt={branch.branchName || "Branch"}
                                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                                <span className={`absolute bottom-4 left-4 rounded-full px-3 py-1 text-xs font-semibold capitalize ${branch.status === "active"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-amber-100 text-amber-800"
                                    }`}>
                                    {branch.status || "draft"}
                                </span>
                            </div>

                            <div className="p-5">
                                <div className="mb-4">
                                    <h3 className="text-lg font-semibold text-gray-950">
                                        {branch.branchName || "Unnamed Branch"}
                                    </h3>
                                    <p className="mt-2 text-gray-600 text-sm flex items-start gap-2">
                                        <FaMapMarkerAlt className="mt-1 shrink-0 text-gray-400" />
                                        <span>{branch.location || "Location not available"}</span>
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                                    <div className="rounded-2xl bg-gray-50 p-3">
                                        <p className="flex items-center gap-2 font-medium text-gray-900">
                                            <FaCity className="text-gray-400" /> City
                                        </p>
                                        <p className="mt-1 truncate">{getBranchCityName(branch)}</p>
                                    </div>
                                    <div className="rounded-2xl bg-gray-50 p-3">
                                        <p className="flex items-center gap-2 font-medium text-gray-900">
                                            <FaUsers className="text-gray-400" /> Capacity
                                        </p>
                                        <p className="mt-1">{branch.branchCapacity || "N/A"}</p>
                                    </div>
                                    <div className="col-span-2 rounded-2xl bg-gray-50 p-3">
                                        <p className="flex items-center gap-2 font-medium text-gray-900">
                                            <FaClock className="text-gray-400" /> Timings
                                        </p>
                                        <p className="mt-1">{getBranchTimings(branch)}</p>
                                    </div>
                                </div>

                                <button
                                    onClick={() =>
                                        navigate(`/admin/centers/${slugify(branch._id)}`, {
                                            state: { branch },
                                        })
                                    }
                                    className="mt-5 w-full rounded-2xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
                                >
                                    View Details
                                </button>
                            </div>
                        </div>
                    ))}
            </div>
        </div>
    );
};

export default OfflineCentersPage;
