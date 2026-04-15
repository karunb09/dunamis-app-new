import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import CourseCard from '../../components/CourseCard';
import { FaTh, FaList, FaSortAmountDown, FaFilter, FaPlus, FaSearch, FaEdit, FaTrash, FaCloudUploadAlt, FaRegClock } from 'react-icons/fa';
import Pagination from '../../components/Pagination';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { deleteCourse, getCourses, updateCourse } from '../../redux/Course/CourseSlice';
import Swal from 'sweetalert2';
import { DEFAULT_AVATAR, resolveImageUrl } from '../../utils/resolveImageUrl';
import IconActionButton from '../../components/IconActionButton';

const TABS = ['Active Courses', 'Draft Courses'];
const SORT_OPTIONS = [
    { value: 'name-asc', label: 'Name A-Z' },
    { value: 'name-desc', label: 'Name Z-A' },
    { value: 'price-asc', label: 'Price Low to High' },
    { value: 'price-desc', label: 'Price High to Low' },
];

const CourseManagement = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { courseList, status, error } = useSelector((state) => state.course);

    const [searchTerm, setSearchTerm] = useState('');

    const [isGridView, setIsGridView] = useState(() => {
        const savedView = localStorage.getItem('courseView');
        return savedView ? JSON.parse(savedView) : true;
    });

    const [activeTab, setActiveTab] = useState(() => {
        const savedTab = localStorage.getItem('activeTab');
        return savedTab || 'Active Courses';
    });

    const [gridPage, setGridPage] = useState(1);
    const [listPage, setListPage] = useState(1);

    // Sort dropdown state
    const [sortOpen, setSortOpen] = useState(false);
    const [sortOption, setSortOption] = useState('name-asc');

    // Filter modal state
    const [filterOpen, setFilterOpen] = useState(false);

    // Filters state
    const [filters, setFilters] = useState({
        category: '',
        level: '',
        mode: '',
        status: '',
        priceMin: '',
        priceMax: '',
    });

    const CARDS_PER_PAGE = 6;
    const ROWS_PER_PAGE = 12;

    useEffect(() => {
        dispatch(getCourses());
    }, [dispatch]);

    useEffect(() => {
        localStorage.setItem('courseView', JSON.stringify(isGridView));
    }, [isGridView]);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        localStorage.setItem('activeTab', tab);
        setGridPage(1);
        setListPage(1);
    };

    // utils
    const getSelectedMonthlyFee = (priceArr) => {
        if (!Array.isArray(priceArr)) return 0;
        const selectedPrice = priceArr.find(p => p.isSelected);
        return selectedPrice ? Number(selectedPrice.monthlyFee) : 0;
    };

    // search, tab, and filters
    const filteredCourses = Array.isArray(courseList)
        ? courseList.filter(course => {
            const title = course?.name ?? '';
            const isPublished = Boolean(course.isPublished);

            // Tab filter (Active/Draft)
            if (activeTab === 'Active Courses' && !isPublished) return false;
            if (activeTab === 'Draft Courses' && isPublished) return false;

            // Search filter
            if (!title.toLowerCase().includes(searchTerm.toLowerCase())) return false;

            // Category
            if (filters.category && course.category?.name !== filters.category) return false;

            // Level
            if (filters.level && course.level !== filters.level) return false;

            // Mode
            if (filters.mode && course.mode !== filters.mode) return false;

            // Status
            if (filters.status) {
                if (filters.status === 'published' && !course.isPublished) return false;
                if (filters.status === 'draft' && course.isPublished) return false;
            }

            // Price Range
            const price = getSelectedMonthlyFee(course.price);
            if (filters.priceMin !== '' && price < Number(filters.priceMin)) return false;
            if (filters.priceMax !== '' && price > Number(filters.priceMax)) return false;

            return true;
        })
        : [];

    // Sort
    const sortedCourses = [...filteredCourses].sort((a, b) => {
        switch (sortOption) {
            case 'name-asc':
                return a.name.localeCompare(b.name);
            case 'name-desc':
                return b.name.localeCompare(a.name);
            case 'price-asc':
                return getSelectedMonthlyFee(a.price) - getSelectedMonthlyFee(b.price);
            case 'price-desc':
                return getSelectedMonthlyFee(b.price) - getSelectedMonthlyFee(a.price);
            default:
                return 0;
        }
    });

    const gridTotalPages = Math.ceil(sortedCourses.length / CARDS_PER_PAGE);
    const listTotalPages = Math.ceil(sortedCourses.length / ROWS_PER_PAGE);

    const paginatedGridCourses = sortedCourses.slice(
        (gridPage - 1) * CARDS_PER_PAGE,
        gridPage * CARDS_PER_PAGE
    );

    const paginatedListCourses = sortedCourses.slice(
        (listPage - 1) * ROWS_PER_PAGE,
        listPage * ROWS_PER_PAGE
    );

    const handleRowClick = (_id, e) => {
        if (e.target.closest('.action-menu')) return;
        navigate(`/course/${_id}`);
    };

    const handleMenuAction = async (action, course) => {
        switch (action) {
            case 'Edit':
                navigate(`/admin/edit-course/${course._id}`)
                break;
            case 'Publish':
                try {
                    await dispatch(updateCourse({
                        courseId: course._id,
                        updates: { isPublished: true },
                    })).unwrap();
                    toast.success('Course Published.');
                } catch (err) {
                    toast.error(`Failed to Publish: ${err.message || err}`);
                }
                break;
            case 'Move to drafts':
                try {
                    await dispatch(updateCourse({
                        courseId: course._id,
                        updates: { isPublished: false },
                    })).unwrap();
                    toast.success('Course moved to drafts.');
                } catch (err) {
                    toast.error(`Failed to move to drafts: ${err.message || err}`);
                }
                break;
            case 'Delete': {
                const result = await Swal.fire({
                    title: 'Are you sure?',
                    text: `Do you want to delete the course "${course.name}"? This action cannot be undone.`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: 'Yes, delete it!',
                    cancelButtonText: 'Cancel',
                });

                if (result.isConfirmed) {
                    try {
                        await dispatch(deleteCourse(course._id)).unwrap();
                        toast.success('Course has been deleted.');
                    } catch (err) {
                        toast.error(`Failed to delete course: ${err.message || err}`);
                    }
                }
                break;
            }

            default:
                break;
        }
    };

    // Handle sort option change
    const onSortChange = (value) => {
        setSortOption(value);
        setSortOpen(false);
        // Reset pagination
        setGridPage(1);
        setListPage(1);
    };

    // Handle filter input change
    const onFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    // Clear all filters
    const clearFilters = () => {
        setFilters({
            category: '',
            level: '',
            mode: '',
            status: '',
            priceMin: '',
            priceMax: '',
        });
    };

    const categories = Array.from(new Set(courseList?.map(c => c.category?.name).filter(Boolean) || []));
    const levels = Array.from(new Set(courseList?.map(c => c.level).filter(Boolean) || []));
    const modes = Array.from(new Set(courseList?.map(c => c.mode).filter(Boolean) || []));
    const courseStats = {
        total: courseList?.length || 0,
        active: courseList?.filter((course) => course.isPublished).length || 0,
        drafts: courseList?.filter((course) => !course.isPublished).length || 0,
        offline: courseList?.filter((course) => course.mode === "offline").length || 0,
    };

    return (
        <div className="p-4 md:p-6 bg-[#f7f4ef] min-h-screen">
            <div className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-[#111827] via-[#213547] to-[#b45309] p-6 text-white shadow-lg">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-200">
                            Learning Management
                        </p>
                        <h1 className="mt-3 text-3xl font-semibold">Course Command Center</h1>
                        <p className="mt-2 max-w-2xl text-sm text-white/75">
                            Review course readiness, pricing, instructors, offline branches, and draft/publish status.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/admin/add-course')}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-gray-950 transition hover:bg-orange-50"
                    >
                        <FaPlus /> Add Course
                    </button>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {[
                        { label: "Total", value: courseStats.total },
                        { label: "Active", value: courseStats.active },
                        { label: "Drafts", value: courseStats.drafts },
                        { label: "Offline", value: courseStats.offline },
                    ].map((stat) => (
                        <div key={stat.label} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                            <span className="text-xs uppercase tracking-[0.18em] text-white/65">{stat.label}</span>
                            <p className="mt-2 text-2xl font-semibold">{stat.value}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-gray-300 mb-4">
                {TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => handleTabChange(tab)}
                        className={`pb-2 text-sm font-medium ${activeTab === tab ? 'border-b-2 border-black text-black' : 'text-gray-500 hover:text-black'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                {/* Search */}
                <div className="relative w-full md:w-1/3">
                    <input
                        type="text"
                        placeholder="Search courses"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 gap-1 rounded-2xl border focus:outline-none focus:ring-2 focus:ring-black"
                    />
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                </div>

                {/* View toggles & add button */}
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setIsGridView(true)}
                        className={`p-2 border rounded ${isGridView ? 'bg-gray-200' : ''}`}
                        title="Grid View"
                    >
                        <FaTh />
                    </button>
                    <button
                        onClick={() => setIsGridView(false)}
                        className={`p-2 border rounded ${!isGridView ? 'bg-gray-200' : ''}`}
                        title="List View"
                    >
                        <FaList />
                    </button>
                    {/* Add course lives in the hero CTA */}
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6 relative">
                {/* Sort */}
                <div className="relative">
                    <button
                        className="flex items-center gap-1 px-4 py-2 rounded-2xl border border-black text-sm bg-white hover:bg-gray-100"
                        onClick={() => setSortOpen(!sortOpen)}
                    >
                        <FaSortAmountDown /> Sort
                    </button>
                    {sortOpen && (
                        <div className="absolute z-40 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg">
                            {/* Close Icon */}
                            <div className="flex justify-between items-center px-4 py-2 border-b">
                                <span className="text-sm font-semibold">Sort By</span>
                                <button
                                    onClick={() => setSortOpen(false)}
                                    aria-label="Close sort menu"
                                    className="text-gray-500 hover:text-gray-800"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <ul className="text-sm font-medium">
                                {SORT_OPTIONS.map(({ value, label }) => (
                                    <li
                                        key={value}
                                        className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${sortOption === value ? 'bg-gray-200 font-semibold' : ''
                                            }`}
                                        onClick={() => onSortChange(value)}
                                    >
                                        {label}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Filter */}
                <div>
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
                                {/* Close button */}
                                <button
                                    onClick={() => setFilterOpen(false)}
                                    aria-label="Close filter modal"
                                    className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-xl font-bold"
                                >
                                    <X />
                                </button>

                                <h2 className="text-xl font-semibold mb-4">Filter Courses</h2>

                                {/* Category */}
                                <label className="block mb-2 font-medium">Category</label>
                                <select
                                    value={filters.category}
                                    onChange={e => onFilterChange('category', e.target.value)}
                                    className="w-full mb-4 border rounded px-3 py-2"
                                >
                                    <option value="">All Categories</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>

                                {/* Level */}
                                <label className="block mb-2 font-medium">Level</label>
                                <select
                                    value={filters.level}
                                    onChange={e => onFilterChange('level', e.target.value)}
                                    className="w-full mb-4 border rounded px-3 py-2"
                                >
                                    <option value="">All Levels</option>
                                    {levels.map(level => (
                                        <option key={level} value={level}>{level}</option>
                                    ))}
                                </select>

                                {/* Mode */}
                                <label className="block mb-2 font-medium">Mode</label>
                                <select
                                    value={filters.mode}
                                    onChange={e => onFilterChange('mode', e.target.value)}
                                    className="w-full mb-4 border rounded px-3 py-2"
                                >
                                    <option value="">All Modes</option>
                                    {modes.map(mode => (
                                        <option key={mode} value={mode}>{mode}</option>
                                    ))}
                                </select>

                                {/* Status */}
                                <label className="block mb-2 font-medium">Status</label>
                                <select
                                    value={filters.status}
                                    onChange={e => onFilterChange('status', e.target.value)}
                                    className="w-full mb-4 border rounded px-3 py-2"
                                >
                                    <option value="">All Status</option>
                                    <option value="published">Published</option>
                                    <option value="draft">Draft</option>
                                </select>

                                {/* Price range */}
                                <div className="mb-4">
                                    <label className="block font-medium mb-1">Price Range</label>
                                    <div className="flex gap-2 items-center">
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="Min"
                                            value={filters.priceMin}
                                            onChange={e => onFilterChange('priceMin', e.target.value)}
                                            className="w-1/2 border rounded px-3 py-2"
                                        />
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="Max"
                                            value={filters.priceMax}
                                            onChange={e => onFilterChange('priceMax', e.target.value)}
                                            className="w-1/2 border rounded px-3 py-2"
                                        />
                                    </div>
                                </div>

                                {/* Buttons */}
                                <div className="flex justify-between mt-6">
                                    <button
                                        onClick={() => {
                                            clearFilters();
                                        }}
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
                </div>
            </div>

            {/* Content */}
            {status === 'loading' ? (
                <div className="text-center py-4 text-gray-500">Loading...</div>
            ) : error ? (
                <div className="text-center py-4 text-red-500">Error: {error}</div>
            ) : isGridView ? (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {paginatedGridCourses.length > 0 ? (
                            paginatedGridCourses.map((course) => (
                                <CourseCard
                                    key={course._id}
                                    course={course}
                                    id={course._id}
                                    image={course.image}
                                    category={course.category?.name}
                                    level={course.level}
                                    title={course.name}
                                    isPublished={course.isPublished}
                                    mode={course.mode}
                                    description={course.description}
                                    students={course.totalStudents || 0}
                                    price={getSelectedMonthlyFee(course.price)}
                                    avatars={
                                        course.teacher?.map(
                                            (teacher) => teacher?.teacherDetail?.profilePicture || 'https://via.placeholder.com/150'
                                        )
                                    }
                                />
                            ))
                        ) : (
                            <p className="text-center text-gray-500 col-span-full">No courses found.</p>
                        )}
                    </div>
                    {filteredCourses.length > CARDS_PER_PAGE && (
                        <Pagination currentPage={gridPage} totalPages={gridTotalPages} onPageChange={setGridPage} />
                    )}
                </>
            ) : (
                <>
                    <div className="relative mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                        <table className="min-w-[1120px] w-full text-left text-sm">
                            <thead className="bg-gray-100 text-gray-700 font-semibold">
                                <tr>
                                    <th className="min-w-[240px] whitespace-nowrap px-4 py-3">Title</th>
                                    <th className="min-w-[150px] whitespace-nowrap px-4 py-3">Category</th>
                                    <th className="min-w-[120px] whitespace-nowrap px-4 py-3">Level</th>
                                    <th className="min-w-[110px] whitespace-nowrap px-4 py-3">Mode</th>
                                    <th className="min-w-[130px] whitespace-nowrap px-4 py-3">Status</th>
                                    <th className="min-w-[150px] whitespace-nowrap px-4 py-3">Instructors</th>
                                    <th className="min-w-[110px] whitespace-nowrap px-4 py-3">Students</th>
                                    <th className="min-w-[130px] whitespace-nowrap px-4 py-3">Price (₹/mo)</th>
                                    <th className="min-w-[190px] whitespace-nowrap px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedListCourses.length > 0 ? (
                                    paginatedListCourses.map((course) => (
                                        <tr
                                            key={course._id}
                                            className="border-t hover:bg-gray-50 cursor-pointer"
                                            onClick={(e) => handleRowClick(course._id, e)}
                                        >
                                            <td className="px-4 py-3 font-medium text-slate-900">{course.name}</td>
                                            <td className="px-4 py-3 text-slate-600">{course.category?.name || '-'}</td>
                                            <td className="whitespace-nowrap px-4 py-3 capitalize text-slate-600">{course.level || '-'}</td>
                                            <td className="whitespace-nowrap px-4 py-3 capitalize text-slate-600">{course.mode || '-'}</td>
                                            <td className="whitespace-nowrap px-4 py-3">
                                                <span
                                                    className={`px-2 py-0.5 text-xs rounded-full ${course.isPublished
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-gray-200 text-gray-700'
                                                        }`}
                                                >
                                                    {course.isPublished ? 'Published' : 'Draft'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex -space-x-2">
                                                    {course.teacher?.map((teacher, index) => (
                                                        <img
                                                            key={index}
                                                            src={resolveImageUrl(
                                                                teacher?.teacherDetail?.profilePicture || teacher?.userId?.image,
                                                                DEFAULT_AVATAR
                                                            )}
                                                            alt="teacher"
                                                            className="w-8 h-8 rounded-full border-2 border-white"
                                                        />
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{course.totalStudents || 0}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{getSelectedMonthlyFee(course.price)}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap justify-end gap-1.5">
                                                    <IconActionButton
                                                        label="Edit"
                                                        icon={<FaEdit />}
                                                        tone="sky"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleMenuAction('Edit', course);
                                                        }}
                                                    />
                                                    <IconActionButton
                                                        label={course.isPublished ? 'Move to Drafts' : 'Publish'}
                                                        icon={course.isPublished ? <FaRegClock /> : <FaCloudUploadAlt />}
                                                        tone={course.isPublished ? 'amber' : 'emerald'}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleMenuAction(course.isPublished ? 'Move to drafts' : 'Publish', course);
                                                        }}
                                                    />
                                                    <IconActionButton
                                                        label="Delete"
                                                        icon={<FaTrash />}
                                                        tone="rose"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleMenuAction('Delete', course);
                                                        }}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="9" className="text-center py-4 text-gray-500">
                                            No courses found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        </div>
                    </div>

                    {filteredCourses.length > ROWS_PER_PAGE && (
                        <Pagination currentPage={listPage} totalPages={listTotalPages} onPageChange={setListPage} />
                    )}
                </>
            )}
        </div>
    );
};

export default CourseManagement;
