import React, { useEffect, useState, useRef } from 'react';
import { FaCheckCircle, FaEdit, FaPlus, FaSearch, FaFilter, FaSortAmountDown } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import DataTable from '../../../components/Table';
import { useDispatch, useSelector } from 'react-redux';
import { deleteAdmin, fetchAdmins } from '../../../redux/Admin/AdminSlice';
import Swal from 'sweetalert2';
import { updateUser } from '../../../redux/User/UserSlice';
import { X } from 'react-feather';
import ActionProgressBar from '../../../components/ActionProgressBar';
import IconActionButton from '../../../components/IconActionButton';
import { resolveImageUrl } from '../../../utils/resolveImageUrl';

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
    const [processingAction, setProcessingAction] = useState(null);
    const dropdownRef = useRef(null);

    const getErrorMessage = (error, fallback) => {
        if (typeof error === 'string') return error;
        return error?.message || error?.error || error?.data?.message || fallback;
    };

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

    const getImageUrl = (imagePath) => resolveImageUrl(imagePath, "/profile-photo.png");

    const runAdminAction = async ({ actionKey, progressLabel, loadingMessage, action, successTitle, successText, errorFallback }) => {
        setProcessingAction({ key: actionKey, label: progressLabel });
        const toastId = toast.loading(loadingMessage);

        try {
            const result = await action();
            toast.dismiss(toastId);
            await Swal.fire({
                icon: 'success',
                title: successTitle,
                text: successText,
                confirmButtonColor: '#0f172a',
            });
            return result;
        } catch (error) {
            toast.dismiss(toastId);
            await Swal.fire({
                icon: 'error',
                title: 'Action failed',
                text: getErrorMessage(error, errorFallback),
                confirmButtonColor: '#dc2626',
            });
            throw error;
        } finally {
            setProcessingAction(null);
        }
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

    const _handleDeleteAdmin = (adminId, adminName) => {
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
                runAdminAction({
                    actionKey: `delete-${adminId}`,
                    progressLabel: `Deleting ${adminName}...`,
                    loadingMessage: `Deleting ${adminName}`,
                    action: async () => {
                        await dispatch(deleteAdmin(adminId)).unwrap();
                        await dispatch(fetchAdmins());
                    },
                    successTitle: "Admin deleted",
                    successText: `${adminName} has been deleted.`,
                    errorFallback: `Failed to delete ${adminName}.`,
                }).catch(() => {});
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
                runAdminAction({
                    actionKey: 'bulk-delete-admins',
                    progressLabel: `Deleting ${ids.length} admin${ids.length === 1 ? '' : 's'}...`,
                    loadingMessage: `Deleting ${ids.length} admin${ids.length === 1 ? '' : 's'}`,
                    action: async () => {
                        await Promise.all(ids.map(id => dispatch(deleteAdmin(id)).unwrap()));
                        await dispatch(fetchAdmins());
                    },
                    successTitle: "Admins deleted",
                    successText: `${ids.length} admin${ids.length === 1 ? '' : 's'} have been deleted.`,
                    errorFallback: "Failed to delete one or more admins.",
                }).catch(() => {});
            }
        });
    };

    const columns = [
        { key: 'mockId', header: 'Admin ID', minWidth: '120px', nowrap: true },
        {
            key: 'name',
            header: 'User',
            minWidth: '220px',
            render: (value, row) => (
                <div className="flex min-w-0 items-center gap-2">
                    <img
                        src={getImageUrl(row.userId.image)}
                        alt={row.userId.name.firstName}
                        className="w-8 h-8 rounded-full object-cover"
                        onError={(e) => {
                            e.target.src = "/profile-photo.png";
                        }}
                    />
                    <span className="truncate" title={`${row.userId.name.firstName} ${row.userId.name.lastName}`}>
                        {row.userId.name.firstName} {row.userId.name.lastName}
                    </span>
                </div>
            )
        },
        { key: 'role', header: 'Role', minWidth: '130px', nowrap: true },
        {
            key: 'permissions',
            header: 'Permissions',
            minWidth: '280px',
            render: (_, row) => (
                <span className="block max-w-[260px] whitespace-normal break-words leading-5" title={row.permission.join(', ') || 'No Permissions'}>
                    {row.permission.join(', ') || 'No Permissions'}
                </span>
            ),
        },
        { key: 'department', header: 'Department', minWidth: '160px' },
        {
            key: 'status',
            header: 'Status',
            minWidth: '170px',
            nowrap: true,
            render: (_, row) => (
                <div className="flex justify-center">
                <IconActionButton
                    label={row.userId.accountStatus === 'active' ? 'Disable admin' : 'Enable admin'}
                    icon={<FaCheckCircle />}
                    tone={row.userId.accountStatus === 'active' ? 'emerald' : 'rose'}
                    disabled={Boolean(processingAction)}
                    isLoading={processingAction?.key === `status-${row._id}`}
                    onClick={e => {
                        e.stopPropagation();
                        const newStatus = row.userId.accountStatus === 'active' ? 'inactive' : 'active';
                        runAdminAction({
                            actionKey: `status-${row._id}`,
                            progressLabel: `Updating account status for ${row.userId.name.firstName} ${row.userId.name.lastName}...`,
                            loadingMessage: `Saving status for ${row.userId.name.firstName}`,
                            action: async () => {
                                await dispatch(updateUser({
                                    id: row.userId._id,
                                    userData: { accountStatus: newStatus },
                                    token: localStorage.getItem('token')
                                })).unwrap();
                                await dispatch(fetchAdmins());
                            },
                            successTitle: 'Admin status updated',
                            successText: `${row.userId.name.firstName} is now ${newStatus}.`,
                            errorFallback: 'Failed to update status.',
                        }).catch(() => {});
                    }}
                />
                </div>
            )
        },
        {
            key: 'createdAt',
            header: 'Created At',
            minWidth: '150px',
            nowrap: true,
            render: value => (
                <div>
                    <p className="font-medium text-slate-800">{new Date(value).toLocaleDateString()}</p>
                    <p className="text-xs text-slate-500">{new Date(value).toLocaleTimeString()}</p>
                </div>
            ),
        },
        {
            key: 'action',
            header: 'Actions',
            minWidth: '120px',
            nowrap: true,
            render: (_, row) => (
                <div className="flex justify-end">
                    <IconActionButton
                        label="Edit admin"
                        icon={<FaEdit />}
                        tone="slate"
                        disabled={Boolean(processingAction)}
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/add-admin/${row._id}`);
                        }}
                    />
                </div>
            )
        }
    ];

    return (
        <div className="p-6 bg-white min-h-screen">
            <ActionProgressBar active={Boolean(processingAction)} label={processingAction?.label} />
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
                bulkDeleteLoading={processingAction?.key === 'bulk-delete-admins'}
            />
        </div>
    );
};

export default AdminManageMentPage;
