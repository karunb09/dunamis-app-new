import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaSortAmountDown, FaFilter, FaPlus, FaSearch, FaEllipsisV, FaTimes } from "react-icons/fa";
import { deleteCategory, fetchCategories, updateCategory } from "../../redux/Category/CategorySlice";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { X } from "react-feather";

const SORT_OPTIONS = [
  { value: "name-asc", label: "Name A-Z" },
  { value: "name-desc", label: "Name Z-A" },
  { value: "date-asc", label: "Oldest First" },
  { value: "date-desc", label: "Newest First" },
];

const CategoryManagement = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { categories, status, error } = useSelector((state) => state.category);

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem("categoryTab") || "Active");
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOption, setSortOption] = useState("name-asc");
  const [filters, setFilters] = useState({
    status: "",
    subcategory: "",
    dateFrom: "",
    dateTo: "",
  });
  const [activeMenu, setActiveMenu] = useState(null);

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchCategories());
    }
  }, [dispatch, status]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    localStorage.setItem("categoryTab", tab);
  };

  const handleMenuToggle = (id) => {
    setActiveMenu(activeMenu === id ? null : id);
  };

  const handleEdit = (category) => {
    navigate("/admin/add-category", { state: { category } });
  };

  const handleStatusToggle = (category) => {
    const newStatus = category.status === "draft" ? "published" : "draft";
    dispatch(updateCategory({ id: category._id, updatedData: { ...category, status: newStatus } }))
      .unwrap()
      .then(() => {
        setActiveMenu(null);
        toast.success(`Category status updated to ${newStatus}`);
        window.location.reload();
      })
      .catch((error) => toast.error("Failed to update category status:", error));
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!"
    }).then((result) => {
      if (result.isConfirmed) {
        dispatch(deleteCategory(id))
          .unwrap()
          .then(() => {
            Swal.fire({
              title: "Deleted!",
              text: "Your category has been deleted.",
              icon: "success"
            });
            toast.success("Category deleted successfully");
            setActiveMenu(null);
            dispatch(fetchCategories());
          })
          .catch((error) => toast.error("Failed to delete category: " + error));
      }
    });
  };

  const onSortChange = (value) => {
    setSortOption(value);
  };

  const onFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => setFilters({
    status: "",
    subcategory: "",
    dateFrom: "",
    dateTo: "",
  });

  // Get all unique subcategories
  const allSubcategories = Array.from(
    new Set(categories.flatMap((cat) => (cat.subcategories || []).map((sub) => sub.name)))
  );

  // Filtered categories
  const filteredCategories = (categories || [])
    .filter((cat) => cat.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter((cat) =>
      activeTab === "Active" ? cat.status === "published" : cat.status === "draft"
    )
    .filter((cat) => {
      if (filters.status && cat.status !== filters.status) return false;
      if (filters.subcategory && !(cat.subcategories || []).some(sub => sub.name === filters.subcategory)) return false;
      if (filters.dateFrom && new Date(cat.createdAt) < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && new Date(cat.createdAt) > new Date(filters.dateTo)) return false;
      return true;
    });

  // Sorted categories
  const sortedCategories = [...filteredCategories].sort((a, b) => {
    switch (sortOption) {
      case "name-asc":
        return (a.name || "").localeCompare(b.name || "");
      case "name-desc":
        return (b.name || "").localeCompare(a.name || "");
      case "date-asc":
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      case "date-desc":
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      default:
        return 0;
    }
  });

  if (status === "loading") return <div>Loading categories...</div>;
  if (status === "failed") return <div>Error: {error}</div>;

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="relative w-full md:w-1/3">
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 gap-1 rounded-2xl border focus:outline-none focus:ring-2 focus:ring-black"
          />
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sort */}
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
                    className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${sortOption === value ? "bg-gray-200 font-semibold" : ""
                      }`}
                    onClick={() => {
                      onSortChange(value);
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
                <h2 className="text-xl [font-weight:300] mb-4">Filter Categories</h2>

                {/* Status Filter */}
                <label className="block mb-2 font-medium">Status</label>
                <select
                  value={filters.status || ""}
                  onChange={(e) => onFilterChange("status", e.target.value)}
                  className="w-full mb-4 border rounded px-3 py-2"
                >
                  <option value="">All</option>
                  <option value="published">Active</option>
                  <option value="draft">Draft</option>
                </select>

                {/* Subcategory Filter */}
                <label className="block mb-2 font-medium">Subcategory</label>
                <select
                  value={filters.subcategory || ""}
                  onChange={(e) => onFilterChange("subcategory", e.target.value)}
                  className="w-full mb-4 border rounded px-3 py-2"
                >
                  <option value="">All</option>
                  {allSubcategories.map((sub, idx) => (
                    <option key={idx} value={sub}>{sub}</option>
                  ))}
                </select>

                {/* Date Filters */}
                <label className="block mb-2 font-medium">Created From</label>
                <input
                  type="date"
                  value={filters.dateFrom || ""}
                  onChange={(e) => onFilterChange("dateFrom", e.target.value)}
                  className="w-full mb-4 border rounded px-3 py-2"
                />
                <label className="block mb-2 font-medium">Created To</label>
                <input
                  type="date"
                  value={filters.dateTo || ""}
                  onChange={(e) => onFilterChange("dateTo", e.target.value)}
                  className="w-full mb-4 border rounded px-3 py-2"
                />

                {/* Buttons */}
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

          {/* Add Category Button */}
          <button
            onClick={() => navigate("/admin/add-category")}
            className="flex items-center bg-black text-white gap-2 px-4 py-2 rounded-2xl hover:bg-gray-700 transition whitespace-nowrap"
          >
            <FaPlus /> Add Category
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 mb-4 mt-4 border-b border-gray-300">
        <button
          className={`pb-2 ${activeTab === "Active" ? "text-black border-b-2 border-black" : "text-gray-500"}`}
          onClick={() => handleTabChange("Active")}
        >
          Active
        </button>
        <button
          className={`pb-2 ${activeTab === "Drafts" ? "text-black border-b-2 border-black" : "text-gray-500"}`}
          onClick={() => handleTabChange("Drafts")}
        >
          Drafts
        </button>
      </div>

      {/* Category Cards */}
      {sortedCategories.length === 0 ? (
        <div className="text-center text-gray-500 text-lg mt-10 col-span-3">
          No Available Categories
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedCategories.map((category) => (
            <div
              key={category._id}
              className="bg-white rounded-lg p-4 hover:shadow-lg transition-shadow border border-gray-200 relative"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {category.icon?.startsWith("http") ? (
                    <img src={category.icon} alt={category.name} className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <span className="text-md text-gray-500">{category.icon}</span>
                  )}
                  <span
                    className="w-6 h-6 rounded-full border border-gray-300"
                    style={{ backgroundColor: category.color }}
                  />
                </div>
                <FaEllipsisV
                  className="text-gray-400 cursor-pointer hover:text-black"
                  onClick={() => handleMenuToggle(category._id)}
                />
                {activeMenu === category._id && (
                  <div className="absolute right-0 top-8 bg-white shadow-lg border border-gray-200 rounded-lg w-40 z-50">
                    <div className="flex justify-between items-center p-2">
                      <h3 className="text-sm text-gray-600">Options</h3>
                      <FaTimes
                        className="text-gray-400 cursor-pointer hover:text-black"
                        onClick={() => setActiveMenu(null)}
                      />
                    </div>
                    <ul className="text-sm text-gray-600">
                      <li
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => handleEdit(category)}
                      >
                        Edit
                      </li>
                      <li
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => handleStatusToggle(category)}
                      >
                        {category.status === "draft" ? "Publish Category" : "Move to Drafts"}
                      </li>
                      <li
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-red-500"
                        onClick={() => handleDelete(category._id)}
                      >
                        Delete
                      </li>
                    </ul>
                  </div>
                )}
              </div>
              <h3 className="text-lg text-gray-400">Category</h3>
              <p className="text-gray-800 font-medium">{category.name}</p>
              <h4 className="text-md font-medium mt-2 text-gray-400">Sub-category</h4>
              <ul className="list-disc list-inside text-gray-600">
                {(category.subcategories || []).map((sub, index) => (
                  <li key={index}>{sub.name}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;
