import React, { useEffect, useState, useRef } from 'react';
import { FaCheckCircle, FaEdit, FaPlus, FaSearch, FaFilter, FaSortAmountDown, FaTrash, FaUserSlash } from 'react-icons/fa';
import { FiClipboard } from "react-icons/fi";
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { deleteAdmin, fetchAdmins } from '../../../redux/Admin/AdminSlice';
import Swal from 'sweetalert2';
import { updateUser } from '../../../redux/User/UserSlice';
import { FiX } from "react-icons/fi";
import ActionProgressBar from '../../../components/ActionProgressBar';
import { resolveImageUrl } from '../../../utils/resolveImageUrl';
import DataCards from '../../../components/DataCards';
import PersonCard from '../../../components/cards/PersonCard';

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
            await Swal.fire({ icon: 'success', title: successTitle, text: successText, confirmButtonColor: '#0f172a' });
            return result;
        } catch (error) {
            toast.dismiss(toastId);
            await Swal.fire({ icon: 'error', title: 'Action failed', text: getErrorMessage(error, errorFallback), confirmButtonColor: '#dc2626' });
            throw error;
        } finally {
            setProcessingAction(null);
        }
    };

    const handleDeleteAdmin = (adminId, adminName) => {
        if (!adminId || adminId === "0") { toast.error("Invalid Admin ID"); return; }
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
        if (!ids || ids.length === 0) { toast.error("No admins selected for deletion"); return; }
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
        .map((admin) => ({ ...admin, employeeId: admin.userId?.employeeId || "—" }));

    if (sortOption) {
        switch (sortOption) {
            case 'name-asc': filteredAdmins.sort((a, b) => a.userId.name.firstName.localeCompare(b.userId.name.firstName)); break;
            case 'name-desc': filteredAdmins.sort((a, b) => b.userId.name.firstName.localeCompare(a.userId.name.firstName)); break;
            case 'createdAt-asc': filteredAdmins.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); break;
            case 'createdAt-desc': filteredAdmins.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
        }
    }

    const activeFilterCount = Object.values(filters).filter(Boolean).length;

    return (
        <div className="min-h-screen bg-slate-50/40 p-6">
            <ActionProgressBar active={Boolean(processingAction)} label={processingAction?.label} />

            {/* Page header */}
            <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">User Management</p>
                <h1 className="mt-1 text-2xl font-bold text-slate-900">Admins</h1>
                <p className="mt-0.5 text-sm text-slate-500">Manage admin accounts and their permissions.</p>
            </div>

            {/* Toolbar */}
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:w-72">
                    <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                    <input
                        type="text"
                        placeholder="Search admins…"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2">
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
                            activeFilterCount
                                ? "border-orange-300 bg-orange-50 text-orange-700"
                                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                    >
                        <FaFilter size={13} />
                        Filter
                        {activeFilterCount > 0 && (
                            <span className="rounded-full bg-[#FF6B35] px-2 py-0.5 text-xs font-semibold text-white">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate('/admin/add-admin')}
                        className="inline-flex items-center gap-2 rounded-2xl bg-[#FF6B35] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#fd5a1f]"
                    >
                        <FaPlus size={12} /> Add Admin
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
                        <h2 className="mt-1 text-lg font-bold text-slate-900">Filter Admins</h2>

                        <div className="mt-5 space-y-4">
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Status</label>
                                <select
                                    value={filters.status}
                                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                >
                                    <option value="">All</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Department</label>
                                <select
                                    value={filters.department}
                                    onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                >
                                    <option value="">All</option>
                                    {uniqueDepartments.map(dep => (
                                        <option key={dep} value={dep}>{dep}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setFilters({ status: '', department: '' })}
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

            <DataCards
                data={filteredAdmins}
                itemsPerPage={12}
                emptyMessage="No admins found."
                onDeleteSelected={(ids, selectedAdmins) => handleDeleteSelectedAdmins(ids, selectedAdmins)}
                bulkDeleteLoading={processingAction?.key === 'bulk-delete-admins'}
                renderCard={(row, { selected, onSelect }) => {
                    const firstName = row.userId.name.firstName;
                    const lastName = row.userId.name.lastName;
                    const fullName = `${firstName} ${lastName}`;
                    const isActive = row.userId.accountStatus === 'active';

                    return (
                        <PersonCard
                            avatarSrc={getImageUrl(row.userId.image) || undefined}
                            name={fullName}
                            subtitle={[row.role, row.department].filter(Boolean).join(' • ') || undefined}
                            statusBadge={
                                isActive
                                    ? { label: "Active", className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", dot: true, dotClass: "bg-emerald-500" }
                                    : { label: "Inactive", className: "bg-rose-50 text-rose-700 ring-1 ring-rose-200", dot: true, dotClass: "bg-rose-500" }
                            }
                            meta={[
                                { label: "Employee ID", value: row.employeeId },
                                { label: "Department", value: row.department || "N/A" },
                                { label: "Role", value: row.role || "N/A" },
                                { label: "Created", value: new Date(row.createdAt).toLocaleDateString() },
                            ]}
                            onView={() => navigate(`/admin/add-admin/${row._id}`)}
                            primaryLabel="Edit Admin"
                            menuItems={[
                                {
                                    label: isActive ? 'Disable Admin' : 'Enable Admin',
                                    icon: isActive ? <FaUserSlash size={13} /> : <FaCheckCircle size={13} />,
                                    disabled: Boolean(processingAction),
                                    onClick: () => {
                                        const newStatus = isActive ? 'inactive' : 'active';
                                        runAdminAction({
                                            actionKey: `status-${row._id}`,
                                            progressLabel: `Updating account status for ${fullName}...`,
                                            loadingMessage: `Saving status for ${firstName}`,
                                            action: async () => {
                                                await dispatch(updateUser({
                                                    id: row.userId._id,
                                                    userData: { accountStatus: newStatus },
                                                    token: localStorage.getItem('token')
                                                })).unwrap();
                                                await dispatch(fetchAdmins());
                                            },
                                            successTitle: 'Admin status updated',
                                            successText: `${firstName} is now ${newStatus}.`,
                                            errorFallback: 'Failed to update status.',
                                        }).catch(() => {});
                                    },
                                },
                                {
                                    label: 'Delete',
                                    icon: <FaTrash size={13} />,
                                    danger: true,
                                    disabled: Boolean(processingAction),
                                    onClick: () => handleDeleteAdmin(row._id, fullName),
                                },
                            ]}
                            selected={selected}
                            onSelect={onSelect}
                        >
                            {/* Permissions pills */}
                            {row.permission?.length > 0 && (
                                <div className="pb-1">
                                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Permissions</p>
                                    <div className="flex flex-wrap gap-1">
                                        {row.permission.slice(0, 4).map((perm, i) => (
                                            <span key={i} className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                                {perm}
                                            </span>
                                        ))}
                                        {row.permission.length > 4 && (
                                            <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                                                +{row.permission.length - 4} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </PersonCard>
                    );
                }}
            />
        </div>
    );
};

export default AdminManageMentPage;
