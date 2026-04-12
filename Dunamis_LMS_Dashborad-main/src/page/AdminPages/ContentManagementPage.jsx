import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaFilter, FaSortAmountDown, FaPlus, FaSearch, FaCopy, FaBook, FaTrash, FaLayerGroup, FaRegClock, FaStream, FaEdit } from "react-icons/fa";
import toast from "react-hot-toast";
import { deleteContent, fetchAllContent } from "../../redux/Content/ContentSlice";
import Swal from "sweetalert2";
import { X } from "react-feather";

const SORT_OPTIONS = [
  { value: "title-asc", label: "Name A-Z" },
  { value: "title-desc", label: "Name Z-A" },
  { value: "date-asc", label: "Oldest First" },
  { value: "date-desc", label: "Newest First" },
];

const ContentManagementPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { contentList, loading, error } = useSelector((state) => state.content);
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("Active");
  const [sortOption, setSortOption] = useState("title-asc");

  const [filters, setFilters] = useState({
    category: "",
    subcategory: "",
    minModules: "",
  });

  const [subcategoriesForSelectedCategory, setSubcategoriesForSelectedCategory] = useState([]);

  const contentStats = {
    total: contentList?.length || 0,
    active: contentList?.filter((content) => content.status === "published").length || 0,
    drafts: contentList?.filter((content) => content.status !== "published").length || 0,
    modules:
      contentList?.reduce(
        (sum, content) => sum + (content.modules?.length || 0),
        0
      ) || 0,
  };

  // Fetch all content on mount
  useEffect(() => {
    dispatch(fetchAllContent());
  }, [dispatch]);

  const allCategories = Array.from(
    new Set(contentList.map(c => c.category?.name).filter(Boolean))
  );

  const onFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));

    // Update subcategories dynamically when category changes
    if (field === "category") {
      setFilters(prev => ({ ...prev, subcategory: "" }));
      if (value) {
        const subs = contentList
          .filter(c => c.category?.name === value)
          .map(c => c.subCategory?.name)
          .filter(Boolean);
        setSubcategoriesForSelectedCategory([...new Set(subs)]);
      } else {
        setSubcategoriesForSelectedCategory([]);
      }
    }
  };

  const clearFilters = () => {
    setFilters({
      category: "",
      subcategory: "",
      minModules: "",
    });
    setSubcategoriesForSelectedCategory([]);
  };

  // Filtering
  const filteredContents = Array.isArray(contentList)
    ? contentList.filter((content) => {
      const isPublished = content.status === "published";

      if (activeTab === "Active" && !isPublished) return false;
      if (activeTab === "Drafts" && isPublished) return false;

      const title = content?.courseName ?? "";
      if (!title.toLowerCase().includes(searchTerm.toLowerCase())) return false;

      if (filters.category && content.category?.name !== filters.category) return false;
      if (filters.subcategory && content.subCategory?.name !== filters.subcategory) return false;
      if (filters.minModules && (content.modules?.length || 0) < Number(filters.minModules)) return false;

      return true;
    })
    : [];

  // Sorting
  const sortedContents = [...filteredContents].sort((a, b) => {
    switch (sortOption) {
      case "title-asc":
        return (a.courseName || "").localeCompare(b.courseName || "");
      case "title-desc":
        return (b.courseName || "").localeCompare(a.courseName || "");
      case "date-asc":
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      case "date-desc":
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      default:
        return 0;
    }
  });

  const getCategoryStyle = (category) => {
    if (!category) return { class: "bg-gray-100 text-gray-800", icon: "✦" };
    return {
      class: "bg-gray-100 text-gray-800",
      icon: category.icon || "✦",
    };
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        dispatch(deleteContent(id))
          .unwrap()
          .then(() => {
            Swal.fire({
              title: "Deleted!",
              text: "Your Content has been deleted.",
              icon: "success",
            });
            toast.success("Content deleted successfully");
            dispatch(fetchAllContent());
          })
          .catch((error) => {
            toast.error("Failed to delete content: " + error);
          });
      }
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="p-4 md:p-6 bg-[#f5f7fb] min-h-screen">
      <div className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f172a] via-[#1e3a5f] to-[#0f766e] p-6 text-white shadow-lg">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
              Learning Management
            </p>
            <h1 className="mt-3 text-3xl font-semibold">Content Studio</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/75">
              Build and curate course content, modules, categories, and publishing readiness.
            </p>
          </div>
          <button
            onClick={() => navigate("/admin/content/create")}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-gray-950 transition hover:bg-cyan-50"
          >
            <FaPlus /> Add Content
          </button>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Total", value: contentStats.total, icon: <FaLayerGroup /> },
            { label: "Active", value: contentStats.active, icon: <FaStream /> },
            { label: "Drafts", value: contentStats.drafts, icon: <FaRegClock /> },
            { label: "Modules", value: contentStats.modules, icon: <FaBook /> },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
              <div className="flex items-center justify-between text-white/70">
                <span className="text-xs uppercase tracking-[0.18em]">{stat.label}</span>
                {stat.icon}
              </div>
              <p className="mt-2 text-2xl font-semibold">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

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
          {/* Sort Button */}
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
                    className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${sortOption === value ? 'bg-gray-200 font-semibold' : ''}`}
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
                <h2 className="text-xl font-semibold mb-4">Filter Content</h2>

                {/* Category Filter */}
                <label className="block mb-2 font-medium">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => onFilterChange("category", e.target.value)}
                  className="w-full mb-4 border rounded px-3 py-2"
                >
                  <option value="">All</option>
                  {allCategories.map((cat, idx) => (
                    <option key={idx} value={cat}>{cat}</option>
                  ))}
                </select>

                {/* Subcategory Filter */}
                <label className="block mb-2 font-medium">Subcategory</label>
                <select
                  value={filters.subcategory}
                  onChange={(e) => onFilterChange("subcategory", e.target.value)}
                  className="w-full mb-4 border rounded px-3 py-2"
                  disabled={!filters.category}
                >
                  <option value="">All</option>
                  {subcategoriesForSelectedCategory.map((sub, idx) => (
                    <option key={idx} value={sub}>{sub}</option>
                  ))}
                </select>

                {/* Number of Modules Filter */}
                <label className="block mb-2 font-medium">Number of Modules (Min)</label>
                <input
                  type="number"
                  value={filters.minModules || ""}
                  onChange={(e) => onFilterChange("minModules", e.target.value)}
                  className="w-full mb-4 border rounded px-3 py-2"
                  placeholder="Enter minimum number of modules"
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

          {/* Add Content lives in the hero CTA */}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-300 mb-4">
        <button
          className={`pb-2 ${activeTab === "Active" ? "text-black border-b-2 border-black" : "text-gray-500"}`}
          onClick={() => setActiveTab("Active")}
        >
          Active
        </button>
        <button
          className={`pb-2 ${activeTab === "Drafts" ? "text-black border-b-2 border-black" : "text-gray-500"}`}
          onClick={() => setActiveTab("Drafts")}
        >
          Drafts
        </button>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : sortedContents.length === 0 ? (
        <div className="text-center text-gray-500 text-lg mt-10">No Available Content</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedContents.map((course) => {
            const categoryObj = course.category || { name: "Uncategorized", icon: "✦" };
            const style = getCategoryStyle(categoryObj);

            return (
              <Link to={`/admin/content/details/${course._id}`} key={course._id} className="block">
                <div className="group h-full overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl flex flex-col">
                  <div className="flex flex-col items-start">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${style.class}`}
                    >
                      {style.icon} {categoryObj.name || "Uncategorized"}
                    </span>
                    <h3 className="text-xl font-semibold text-gray-950 mt-4">{course.courseName}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 flex-grow line-clamp-3">
                    {course.courseDescription || "No description provided."}
                  </p>
                  <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-gray-600">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="font-medium text-gray-900">Modules</p>
                      <p className="mt-1 flex items-center gap-2">
                        <FaBook /> {course.modules?.length || 0}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="font-medium text-gray-900">Status</p>
                      <p className="mt-1 capitalize">{course.status || "draft"}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-5 pt-4 border-t border-gray-100">
                    <span className="text-xs text-gray-400">
                      ID: {course._id?.slice(-6)}
                    </span>
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <button
                        className="rounded-full border border-gray-200 p-2 transition hover:bg-gray-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          copyToClipboard(course._id);
                        }}
                        aria-label="Copy content ID"
                      >
                        <FaCopy />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          navigate(`/admin/content/edit/${course._id}`);
                        }}
                        className="rounded-full border border-gray-200 p-2 text-gray-700 transition hover:bg-gray-100"
                        aria-label="Edit content"
                      >
                        <FaEdit />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleDelete(course._id);
                        }}
                        className="rounded-full border border-red-100 p-2 text-red-500 transition hover:bg-red-50"
                        aria-label="Delete content"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ContentManagementPage;
