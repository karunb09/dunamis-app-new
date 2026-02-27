import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FaSearch, FaSortAmountDown, FaFilter } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import DataTable from '../../../../components/Table';
import { useNavigate } from 'react-router-dom';
import { fetchTeachers, updateTeacher } from '../../../../redux/Intructor/teacherSlice';
import { updateUser } from '../../../../redux/User/UserSlice';
import { X } from 'react-feather';

const IMAGE = import.meta.env.VITE_IMAGE;

const SORT_OPTIONS = [
    { value: 'name-asc', label: 'Name A-Z' },
    { value: 'name-desc', label: 'Name Z-A' },
    { value: 'joiningDate-asc', label: 'Joining Date Asc' },
    { value: 'joiningDate-desc', label: 'Joining Date Desc' },
];

const mapTeacherToInstructor = (teacher, index) => {
    const fullName = `${teacher.user?.name?.firstName || ''} ${teacher.user?.name?.lastName || ''}`.trim();
    const firstCourse = teacher.courses?.[0];

    return {
        id: teacher.id,
        userId: teacher.user?._id,
        instructorId: `#INST-${index + 1000}`,
        name: fullName,
        avatar: teacher.teacherApplication?.profilePicture || '',
        accountStatus: teacher.user?.accountStatus || 'Inactive',
        courseCategory: teacher.teacherApplication?.areaOfExpertise || '—',
        studentCount: teacher.studentCount || 0,
        mode: teacher.teacherApplication?.mode || '—',
        joiningDate: teacher.createdAt,
        salaryStatus: teacher.salaryStatus,
    };
};

const Instructor = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { teachers, loading, error } = useSelector((state) => state.teachers);

    const [searchTerm, setSearchTerm] = useState('');
    const [sortOpen, setSortOpen] = useState(false);
    const [sortOption, setSortOption] = useState('');
    const [filterOpen, setFilterOpen] = useState(false);
    const [filters, setFilters] = useState({
        accountStatus: '',
        salaryStatus: '',
        mode: '',
    });

    const dropdownRef = useRef(null);

    useEffect(() => {
        dispatch(fetchTeachers());
    }, [dispatch]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setSortOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const mappedInstructors = teachers.map(mapTeacherToInstructor);

    let filteredInstructors = mappedInstructors
        .filter((inst) => {
            const name = inst?.name?.toLowerCase() || '';
            const instructorId = inst?.instructorId?.toLowerCase() || '';
            const courseName = inst?.courseCategory?.toLowerCase() || '';
            return (
                name.includes(searchTerm.toLowerCase()) ||
                instructorId.includes(searchTerm.toLowerCase()) ||
                courseName.includes(searchTerm.toLowerCase())
            );
        })
        .filter((inst) => {
            if (filters.accountStatus && inst.accountStatus !== filters.accountStatus) return false;
            if (filters.salaryStatus && inst.salaryStatus !== filters.salaryStatus) return false;
            if (filters.mode && inst.mode !== filters.mode) return false;
            return true;
        });

    // Apply sorting
    if (sortOption) {
        switch (sortOption) {
            case 'name-asc':
                filteredInstructors.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'name-desc':
                filteredInstructors.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case 'joiningDate-asc':
                filteredInstructors.sort((a, b) => new Date(a.joiningDate) - new Date(b.joiningDate));
                break;
            case 'joiningDate-desc':
                filteredInstructors.sort((a, b) => new Date(b.joiningDate) - new Date(a.joiningDate));
                break;
        }
    }

    const handleRowClick = (instructor) => {
        navigate(
            `/admin/instructor-management/instructors/${instructor.id}`,
            { state: { instructor } }
        );
    };

    const handleCopyDetails = (instructors) => {
        const array = Array.isArray(instructors) ? instructors : [instructors];
        if (!array.length) return toast.error("No instructor data to copy!");

        const details = array
            .map(
                (i) => `Name: ${i.name}
ID: ${i.instructorId}
Account Status: ${i.accountStatus}
Course Category: ${i.courseCategory}
Students: ${i.studentCount}
Mode: ${i.mode}`
            )
            .join("\n\n---\n\n");

        navigator.clipboard
            .writeText(details)
            .then(() => toast.success("Instructor details copied!"))
            .catch(() => toast.error("Failed to copy"));
    };
    // Utility: Convert HEX to RGBA
    const hexToRGBA = (hex, opacity) => {
        let r = 0, g = 0, b = 0;
        if (hex.length === 4) {
            r = parseInt(hex[1] + hex[1], 16);
            g = parseInt(hex[2] + hex[2], 16);
            b = parseInt(hex[3] + hex[3], 16);
        } else if (hex.length === 7) {
            r = parseInt(hex[1] + hex[2], 16);
            g = parseInt(hex[3] + hex[4], 16);
            b = parseInt(hex[5] + hex[6], 16);
        }
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    };

    const columns = [
        { key: 'instructorId', header: 'Instructor ID' },
        {
            key: 'name',
            header: 'Instructor',
            render: (value, row) => (
                <div className="flex items-center gap-2">
                    <img src={`${IMAGE}${row.avatar}`} alt={row.name} className="w-8 h-8 rounded-full" />
                    <span>{row.name}</span>
                </div>
            ),
        },
        {
            key: 'accountStatus',
            header: 'Account Status',
            render: (value, row) => (
                <select
                    value={value}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                        const newStatus = e.target.value;
                        if (newStatus === row.accountStatus) return;
                        dispatch(updateUser({
                            id: row.userId,
                            userData: { accountStatus: newStatus },
                            token: localStorage.getItem('token'),
                        })).unwrap()
                            .then(() => toast.success(`${row.name}'s status updated to ${newStatus}`))
                            .catch(() => toast.error(`Failed to update ${row.name}'s status`));
                    }}
                    className={`text-xs font-medium rounded-full px-3 py-1 ${value === 'active' ? 'text-green-700' : 'text-red-600'}`}
                >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>
            ),
        },
        {
            key: 'courseCategory',
            header: 'Course Category',
            render: (value, row) => (
                <span
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs"
                    style={{
                        backgroundColor: row.courseCategoryColor
                            ? hexToRGBA(row.courseCategoryColor, 0.2)
                            : 'rgba(229, 231, 235, 0.2)'
                    }}
                >
                    {/* <span className="text-lg">{row.courseCategoryIcon}</span> */}
                    {value}
                </span>
            ),
        },
        { key: 'studentCount', header: 'Students' },
        {
            key: 'mode',
            header: 'Mode',
            render: (value) => (
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${value === 'Online' ? 'text-green-500' : 'text-gray-500'}`}>{value}</span>
            ),
        },
        {
            key: 'joiningDate',
            header: 'Joining Date',
            render: (value) => value ? new Date(value).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '—',
        },
        {
            key: 'salaryStatus',
            header: 'Salary Status',
            render: (value, row) => (
                <select
                    value={value}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                        const newStatus = e.target.value;
                        if (newStatus === row.salaryStatus) return;
                        dispatch(updateTeacher({
                            id: row.instructorId,
                            updatedData: { salaryStatus: newStatus },
                        })).unwrap()
                            .then(() => toast.success(`${row.name}'s salary status updated to ${newStatus}`))
                            .catch(() => toast.error(`Failed to update ${row.name}'s salary status`));
                    }}
                    className={`text-xs font-medium rounded-full px-3 py-1 ${value === 'paid' ? 'text-green-700' : 'text-red-600'}`}
                >
                    <option value="due">Due</option>
                    <option value="paid">Paid</option>
                </select>
            ),
        },
    ];

    if (loading) return <p className="text-center py-10">Loading instructors...</p>;
    if (error) return <p className="text-center py-10 text-red-600">Error: {error}</p>;

    return (
        <div>
            {/* Search + Sort + Filter */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
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

                <div className="flex gap-2">
                    <div className="relative">
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
                                        className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${sortOption === value ? 'bg-gray-200 font-semibold' : ''}`}
                                        onClick={() => { setSortOption(value); setSortOpen(false); }}
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

            {filterOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex justify-center items-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
                        <button
                            onClick={() => setFilterOpen(false)}
                            className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-xl font-bold"
                        >
                            <X />
                        </button>
                        <h2 className="text-xl font-semibold mb-4">Filter Instructors</h2>
                        <label className="block mb-2 font-medium">Account Status</label>
                        <select
                            value={filters.accountStatus}
                            onChange={(e) => setFilters({ ...filters, accountStatus: e.target.value })}
                            className="w-full mb-4 border rounded px-3 py-2"
                        >
                            <option value="">All</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>

                        <label className="block mb-2 font-medium">Salary Status</label>
                        <select
                            value={filters.salaryStatus}
                            onChange={(e) => setFilters({ ...filters, salaryStatus: e.target.value })}
                            className="w-full mb-4 border rounded px-3 py-2"
                        >
                            <option value="">All</option>
                            <option value="due">Due</option>
                            <option value="paid">Paid</option>
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
                                onClick={() => setFilters({ accountStatus: '', salaryStatus: '', mode: '' })}
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
                data={filteredInstructors}
                columns={columns}
                itemsPerPage={10}
                emptyMessage="No instructors found."
                onCopyDetails={handleCopyDetails}
                onRowClick={handleRowClick}
            />
        </div>
    );
};

export default Instructor;
