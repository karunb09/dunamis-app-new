import React, { useEffect, useState, useRef } from 'react';
import { FaSearch, FaFilter, FaSortAmountDown, FaPlus } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import DataTable from '../../../components/Table';
import { FaPencil } from 'react-icons/fa6';
import { useDispatch, useSelector } from 'react-redux';
import { deleteAdmin, fetchAdmins } from '../../../redux/Admin/AdminSlice';
import Swal from 'sweetalert2';
import { updateUser } from '../../../redux/User/UserSlice';
import { X } from 'react-feather';

const IMAGE = import.meta.env.VITE_IMAGE;

const SORT_OPTIONS = [
    { value: 'name-asc', label: 'Name A-Z' },
    { value: 'name-desc', label: 'Name Z-A' },
    { value: 'createdAt-asc', label: 'Created At Asc' },
    { value: 'createdAt-desc', label: 'Created At Desc' },
];

const AdminManageMentPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { admins } = useSelector(state => state.admin);

    const [searchTerm, setSearchTerm] = useState('');
    const [sortOpen, setSortOpen] = useState(false);
    const [sortOption, setSortOption] = useState('');
    const [filterOpen, setFilterOpen] = useState(false);
    const [filters, setFilters] = useState({ status: '', department: '' });
    const dropdownRef = useRef(null);

    useEffect(() => {
        dispatch(fetchAdmins());
    }, [dispatch]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setSortOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const uniqueDepartments = [...new Set(admins.map(admin => admin.department).filter(Boolean))];

    // Helper function to get correct image URL
    const getImageUrl = (imagePath) => {
        if (!imagePath) return "https://i.pravatar.cc/150?img=32";
        if (imagePath.startsWith("http")) return imagePath;
        return `${IMAGE}${imagePath}`;
    };

    // Filter + Search
    const filteredAdmins = admins
        .filter(admin => {
            const adminName = `${admin.userId.name.firstName} ${admin.userId.name.lastName}`.toLowerCase();
            const email = (admin.userId.email || '').toLowerCase();
            const role = (admin.role || '').toLowerCase();
            const department = (admin.department || '').toLowerCase();
            return `${adminName} ${email} ${role} ${department}`.includes(searchTerm.toLowerCase());
        })
        .filter(admin => {
            if (filters.status && admin.userId.accountStatus !== filters.status) return false;
            if (filters.department && admin.department !== filters.department) return false;
            return true;
        })
        .map((admin, index) => ({ ...admin, mockId: `#ADM-${1000 + index}` }));

    // Sorting
    if (sortOption) {
        switch (sortOption) {
            case 'name-asc':
                filteredAdmins.sort((a, b) => a.userId.name.firstName.localeCompare(b.userId.name.firstName));
                break;
            case 'name-desc':
                filteredAdmins.sort((a, b) => b.userId.name.firstName.localeCompare(a.userId.name.firstName));
                break;
            case 'createdAt-asc':
                filteredAdmins.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                break;
            case 'createdAt-desc':
                filteredAdmins.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
        }
    }

    const handleDeleteAdmin = (adminId, adminName) => {
        if (!adminId || adminId === "0") {
            toast.error("Invalid Admin ID");
            return;
        }

        Swal.fire({
            title: `Are you sure you want to delete ${adminName}?`,
            text: "You won't be able to revert this!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes, delete it!"
        }).then((result) => {
            if (result.isConfirmed) {
                dispatch(deleteAdmin(adminId))
                    .unwrap()
                    .then(() => {
                        Swal.fire({
                            title: "Deleted!",
                            text: `${adminName} has been deleted.`,
                            icon: "success"
                        });
                        toast.success(`${adminName} deleted successfully`);
                        dispatch(fetchAdmins());
                    })
                    .catch((error) => {
                        toast.error(`Failed to delete ${adminName}: ${error}`);
                    });
            }
        });
    };

    const handleDeleteSelectedAdmins = (ids, selectedAdmins) => {
        if (!ids || ids.length === 0) {
            toast.error("No admins selected for deletion");
            return;
        }

        const title = ids.length === 1
            ? `Are you sure you want to delete ${selectedAdmins[0].userId.name.firstName} ${selectedAdmins[0].userId.name.lastName}?`
            : `Are you sure you want to delete ${ids.length} admins?`;

        Swal.fire({
            title,
            text: "You won't be able to revert this!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: ids.length === 1 ? "Yes, delete it!" : "Yes, delete them!"
        }).then((result) => {
            if (result.isConfirmed) {
                Promise.all(ids.map(id => dispatch(deleteAdmin(id)).unwrap()))
                    .then(() => {
                        Swal.fire({
                            title: "Deleted!",
                            text: `${ids.length} admin${ids.length === 1 ? '' : 's'} have been deleted.`,
                            icon: "success"
                        });
                        toast.success(`${ids.length} admin${ids.length === 1 ? '' : 's'} deleted successfully`);
                        dispatch(fetchAdmins());
                    })
                    .catch((error) => {
                        toast.error("Failed to delete some admins: " + error);
                    });
            }
        });
    };

    const columns = [
        { key: 'mockId', header: 'Admin ID' },
        {
            key: 'name',
            header: 'User',
            render: (value, row) => (
                <div className="flex items-center gap-2">
                    <img
                        src={getImageUrl(row.userId.image)}
                        alt={row.userId.name.firstName}
                        className="w-8 h-8 rounded-full object-cover"
                        onError={(e) => {
                            e.target.src = "https://i.pravatar.cc/150?img=32";
                        }}
                    />
                    <span>{row.userId.name.firstName} {row.userId.name.lastName}</span>
                </div>
            )
        },
        { key: 'role', header: 'Role' },
        { key: 'permissions', header: 'Permissions', render: (_, row) => row.permission.join(', ') || 'No Permissions' },
        { key: 'department', header: 'Department' },
        {
            key: 'status',
            header: 'Status',
            render: (_, row) => (
                <select
                    value={row.userId.accountStatus}
                    onClick={e => e.stopPropagation()}
                    onChange={e => {
                        const newStatus = e.target.value;
                        dispatch(updateUser({
                            id: row.userId._id,
                            userData: { accountStatus: newStatus },
                            token: localStorage.getItem('token')
                        }))
                            .unwrap()
                            .then(() => {
                                toast.success(`${row.userId.name.firstName} is now ${newStatus}`);
                                dispatch(fetchAdmins());
                            })
                            .catch(() => toast.error('Failed to update status'));
                    }}
                    className={`text-xs font-medium rounded-full px-3 py-1 ${row.userId.accountStatus === 'active' ? 'text-green-700' : 'text-red-600'}`}
                >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>
            )
        },
        { key: 'createdAt', header: 'Created At', render: value => new Date(value).toLocaleString() },
        {
            key: 'action',
            header: 'Action',
            render: (_, row) => (
                <button onClick={() => navigate(`/admin/add-admin/${row._id}`)}>
                    <FaPencil />
                </button>
            )
        }
    ];

    return (
        <div className="p-6 bg-white min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div className="relative w-full md:w-1/3">
                    <input
                        type="text"
                        placeholder="Search"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-2xl border focus:outline-none focus:ring-2 focus:ring-black"
                    />
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                </div>

                <div className="flex flex-wrap gap-2">
                    <div className="relative" ref={dropdownRef}>
                        <button
                            className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-black text-sm bg-white hover:bg-gray-100"
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
                        className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-black text-sm bg-white hover:bg-gray-100"
                        onClick={() => setFilterOpen(true)}
                    >
                        <FaFilter /> Filter
                    </button>

                    <button
                        onClick={() => navigate('/admin/add-admin')}
                        className="flex items-center bg-black text-white gap-2 px-4 py-2 rounded-2xl hover:bg-gray-700"
                    >
                        <FaPlus /> Add Admin
                    </button>
                </div>
            </div>

            {filterOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex justify-center items-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
                        <button onClick={() => setFilterOpen(false)} className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-xl font-bold"><X /></button>
                        <h2 className="text-xl font-semibold mb-4">Filter Admins</h2>

                        <label className="block mb-2 font-medium">Status</label>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            className="w-full mb-4 border rounded px-3 py-2"
                        >
                            <option value="">All</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>

                        <label className="block mb-2 font-medium">Department</label>
                        <select
                            value={filters.department}
                            onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                            className="w-full mb-4 border rounded px-3 py-2"
                        >
                            <option value="">All</option>
                            {uniqueDepartments.map(dep => (
                                <option key={dep} value={dep}>{dep}</option>
                            ))}
                        </select>

                        <div className="flex justify-between mt-6">
                            <button className="px-4 py-2 rounded-2xl border hover:bg-gray-200" onClick={() => setFilters({ status: '', department: '' })}>Clear</button>
                            <button className="px-4 py-2 rounded-2xl bg-black text-white hover:bg-gray-800" onClick={() => setFilterOpen(false)}>Apply</button>
                        </div>
                    </div>
                </div>
            )}

            <DataTable
                data={filteredAdmins}
                columns={columns}
                itemsPerPage={10}
                emptyMessage="No admins found."
                onDeleteSelected={(ids, selectedAdmins) => handleDeleteSelectedAdmins(ids, selectedAdmins)}
            />
        </div>
    );
};

export default AdminManageMentPage;
