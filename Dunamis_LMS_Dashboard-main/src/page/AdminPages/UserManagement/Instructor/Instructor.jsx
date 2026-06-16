import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FaCheckCircle, FaClock, FaFilter, FaSearch, FaSortAmountDown, FaTrash, FaUserCheck, FaUserSlash } from 'react-icons/fa';
import { FiClipboard } from "react-icons/fi";
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { fetchTeachers, updateTeacher, deleteTeacher } from '../../../../redux/Intructor/teacherSlice';
import { updateUser } from '../../../../redux/User/UserSlice';
import { FiX } from "react-icons/fi";
import { DEFAULT_AVATAR, resolveImageUrl } from '../../../../utils/resolveImageUrl';
import Swal from 'sweetalert2';
import ActionProgressBar from '../../../../components/ActionProgressBar';
import IconActionButton from '../../../../components/IconActionButton';
import DataCards from '../../../../components/DataCards';
import PersonCard from '../../../../components/cards/PersonCard';
import SlideOver from '../../../../components/SlideOver';

const SORT_OPTIONS = [
    { value: 'name-asc', label: 'Name A-Z' },
    { value: 'name-desc', label: 'Name Z-A' },
    { value: 'joiningDate-asc', label: 'Joining Date Asc' },
    { value: 'joiningDate-desc', label: 'Joining Date Desc' },
];

const mapTeacherToInstructor = (teacher, index) => {
    const fullName = `${teacher.user?.name?.firstName || ''} ${teacher.user?.name?.lastName || ''}`.trim();
    return {
        id: teacher.id,
        userId: teacher.user?._id,
        instructorId: `#INST-${index + 1000}`,
        name: fullName,
        email: teacher.user?.email || '',
        avatar: teacher.teacherApplication?.profilePicture || '',
        userImage: teacher.user?.image || '',
        accountStatus: (teacher.user?.accountStatus || 'inactive').toLowerCase(),
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
    const [filters, setFilters] = useState({ accountStatus: '', salaryStatus: '', mode: '' });
    const [processingAction, setProcessingAction] = useState(null);
    const [slideOver, setSlideOver] = useState({ open: false, instructor: null });
    const dropdownRef = useRef(null);

    const getErrorMessage = (error, fallback) => {
        if (typeof error === 'string') return error;
        return error?.message || error?.error || error?.data?.message || fallback;
    };

    useEffect(() => {
        dispatch(fetchTeachers());
    }, [dispatch]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setSortOpen(false);
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

    if (sortOption) {
        switch (sortOption) {
            case 'name-asc': filteredInstructors.sort((a, b) => a.name.localeCompare(b.name)); break;
            case 'name-desc': filteredInstructors.sort((a, b) => b.name.localeCompare(a.name)); break;
            case 'joiningDate-asc': filteredInstructors.sort((a, b) => new Date(a.joiningDate) - new Date(b.joiningDate)); break;
            case 'joiningDate-desc': filteredInstructors.sort((a, b) => new Date(b.joiningDate) - new Date(a.joiningDate)); break;
        }
    }

    const handleCopyDetails = (instructors) => {
        const array = Array.isArray(instructors) ? instructors : [instructors];
        if (!array.length) return toast.error("No instructor data to copy!");
        const details = array
            .map((i) => `Name: ${i.name}\nID: ${i.instructorId}\nAccount Status: ${i.accountStatus}\nCourse Category: ${i.courseCategory}\nStudents: ${i.studentCount}\nMode: ${i.mode}`)
            .join("\n\n---\n\n");
        navigator.clipboard.writeText(details)
            .then(() => toast.success("Instructor details copied!"))
            .catch(() => toast.error("Failed to copy"));
    };

    const runInstructorAction = async ({ actionKey, progressLabel, loadingMessage, action, successTitle, successText, errorFallback }) => {
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

    const closeSlideOver = () => setSlideOver((prev) => ({ ...prev, open: false }));

    const renderInstructorSlide = () => {
        const r = slideOver.instructor;
        if (!r) return null;

        const avatarSrc = r.avatar || r.userImage;

        return (
            <>
                <div className="bg-gradient-to-b from-orange-50 to-white px-6 pb-6 pt-14">
                    <div className="flex items-start gap-4">
                        {avatarSrc ? (
                            <img
                                src={resolveImageUrl(avatarSrc, DEFAULT_AVATAR)}
                                alt={r.name}
                                className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-4 ring-white shadow-md"
                                onError={(e) => { e.currentTarget.style.display = "none"; }}
                            />
                        ) : (
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFD9C7] to-[#FFF1EB] text-xl font-bold text-[#FF6B35] ring-4 ring-white shadow-md">
                                {(r.name[0] || "?").toUpperCase()}
                            </div>
                        )}
                        <div className="min-w-0 flex-1 pt-1">
                            <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">Instructor Profile</p>
                            <h2 className="mt-0.5 truncate text-xl font-bold text-slate-900">{r.name}</h2>
                            {r.courseCategory !== '—' && (
                                <p className="truncate text-sm text-slate-500">{r.courseCategory}</p>
                            )}
                        </div>
                        <span className={`mt-1 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            r.accountStatus === 'active'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                        }`}>
                            {r.accountStatus === 'active' ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-2 divide-x divide-slate-100 border-y border-slate-100">
                    {[
                        { label: 'Students', value: r.studentCount || 0 },
                        { label: 'Mode', value: r.mode !== '—' ? r.mode.charAt(0).toUpperCase() + r.mode.slice(1) : '—' },
                    ].map((stat) => (
                        <div key={stat.label} className="py-4 text-center">
                            <p className="text-xl font-bold text-slate-900">{stat.value}</p>
                            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{stat.label}</p>
                        </div>
                    ))}
                </div>

                <div className="px-6 py-5">
                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Details</p>
                    <div className="space-y-2.5">
                        {[
                            { label: 'ID', value: r.instructorId },
                            r.email ? { label: 'Email', value: r.email } : null,
                            {
                                label: 'Joined',
                                value: r.joiningDate
                                    ? new Date(r.joiningDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
                                    : '—',
                            },
                            {
                                label: 'Salary',
                                value: r.salaryStatus === 'paid' ? 'Paid ✓' : 'Due',
                            },
                        ].filter(Boolean).map(({ label, value }) => (
                            <div key={label} className="flex items-baseline gap-3 text-sm">
                                <span className="w-12 shrink-0 text-slate-400">{label}</span>
                                <span className="break-all font-medium text-slate-900">{value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </>
        );
    };

    if (loading) return <p className="py-10 text-center text-slate-500">Loading instructors…</p>;
    if (error) return <p className="py-10 text-center text-rose-600">Error: {error}</p>;

    return (
        <div>
            <ActionProgressBar active={Boolean(processingAction)} label={processingAction?.label} />

            {/* Toolbar */}
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:w-72">
                    <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                    <input
                        type="text"
                        placeholder="Search instructors…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-2xl bg-[#FF6B35] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#fd5a1f]"
                        onClick={() => navigate('/admin/instructor-management/add-instructor')}
                    >
                        Add Instructor
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
                        <h2 className="mt-1 text-lg font-bold text-slate-900">Filter Instructors</h2>

                        <div className="mt-5 space-y-4">
                            {[
                                { label: "Account Status", key: "accountStatus", options: [{ v: "active", l: "Active" }, { v: "inactive", l: "Inactive" }] },
                                { label: "Salary Status", key: "salaryStatus", options: [{ v: "due", l: "Due" }, { v: "paid", l: "Paid" }] },
                                { label: "Mode", key: "mode", options: [{ v: "online", l: "Online" }, { v: "offline", l: "Offline" }, { v: "hybrid", l: "Hybrid" }] },
                            ].map(({ label, key, options }) => (
                                <div key={key}>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
                                    <select
                                        value={filters[key]}
                                        onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                    >
                                        <option value="">All</option>
                                        {options.map(({ v, l }) => <option key={v} value={v}>{l}</option>)}
                                    </select>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setFilters({ accountStatus: '', salaryStatus: '', mode: '' })}
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
                data={filteredInstructors}
                itemsPerPage={12}
                emptyMessage="No instructors found."
                onCopyDetails={handleCopyDetails}
                renderCard={(row, { selected, onSelect }) => (
                    <PersonCard
                        avatarSrc={resolveImageUrl(row.avatar || row.userImage, DEFAULT_AVATAR) || undefined}
                        name={row.name}
                        subtitle={row.courseCategory !== '—' ? row.courseCategory : undefined}
                        statusBadge={
                            row.accountStatus === 'active'
                                ? { label: "Active", className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", dot: true, dotClass: "bg-emerald-500" }
                                : { label: "Inactive", className: "bg-rose-50 text-rose-700 ring-1 ring-rose-200", dot: true, dotClass: "bg-rose-500" }
                        }
                        meta={[
                            { label: "Instructor ID", value: row.instructorId },
                            { label: "Students", value: row.studentCount },
                            { label: "Mode", value: row.mode !== '—' ? row.mode : "N/A" },
                            {
                                label: "Joined",
                                value: row.joiningDate
                                    ? new Date(row.joiningDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
                                    : '—'
                            },
                        ]}
                        onView={() => setSlideOver({ open: true, instructor: row })}
                        primaryLabel="View Instructor"
                        menuItems={[
                            {
                                label: "Copy Details",
                                icon: <FiClipboard size={13} />,
                                onClick: () => handleCopyDetails([row]),
                            },
                            {
                                label: row.accountStatus === 'active' ? 'Disable' : 'Enable',
                                icon: row.accountStatus === 'active' ? <FaUserSlash size={13} /> : <FaUserCheck size={13} />,
                                disabled: Boolean(processingAction),
                                onClick: () => {
                                    const nextStatus = row.accountStatus === 'active' ? 'inactive' : 'active';
                                    const actionLabel = nextStatus === 'inactive' ? 'disable' : 'enable';
                                    if (!window.confirm(`Do you want to ${actionLabel} ${row.name}?`)) return;
                                    runInstructorAction({
                                        actionKey: `status-${row.id}`,
                                        progressLabel: `Updating account status for ${row.name}...`,
                                        loadingMessage: `Applying status change for ${row.name}`,
                                        action: async () => {
                                            await dispatch(updateUser({ id: row.userId, userData: { accountStatus: nextStatus }, token: localStorage.getItem('token') })).unwrap();
                                            await dispatch(fetchTeachers());
                                        },
                                        successTitle: 'Instructor status updated',
                                        successText: `${row.name} is now ${nextStatus === 'active' ? 'enabled' : 'disabled'}.`,
                                        errorFallback: `Failed to update ${row.name}'s status.`,
                                    }).catch(() => {});
                                },
                            },
                            {
                                label: 'Delete',
                                icon: <FaTrash size={13} />,
                                danger: true,
                                disabled: Boolean(processingAction),
                                onClick: () => {
                                    if (!window.confirm(`Delete ${row.name}? This only works if the instructor has no live bookings, payments, or occupied slots.`)) return;
                                    runInstructorAction({
                                        actionKey: `delete-${row.id}`,
                                        progressLabel: `Deleting ${row.name}...`,
                                        loadingMessage: `Deleting ${row.name}`,
                                        action: async () => {
                                            await dispatch(deleteTeacher(row.id)).unwrap();
                                            await dispatch(fetchTeachers());
                                        },
                                        successTitle: 'Instructor deleted',
                                        successText: `${row.name} has been removed successfully.`,
                                        errorFallback: `Failed to delete ${row.name}.`,
                                    }).catch(() => {});
                                },
                            },
                        ]}
                        selected={selected}
                        onSelect={onSelect}
                    >
                        {/* Salary status toggle */}
                        <div className="pb-1">
                            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Salary Status</p>
                            <IconActionButton
                                label={row.salaryStatus === 'paid' ? 'Mark salary as due' : 'Mark salary as paid'}
                                icon={row.salaryStatus === 'paid' ? <FaCheckCircle /> : <FaClock />}
                                tone={row.salaryStatus === 'paid' ? 'emerald' : 'amber'}
                                disabled={Boolean(processingAction)}
                                isLoading={processingAction?.key === `salary-${row.id}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const newStatus = row.salaryStatus === 'paid' ? 'due' : 'paid';
                                    runInstructorAction({
                                        actionKey: `salary-${row.id}`,
                                        progressLabel: `Updating salary status for ${row.name}...`,
                                        loadingMessage: `Saving salary status for ${row.name}`,
                                        action: async () => {
                                            await dispatch(updateTeacher({ id: row.id, updatedData: { salaryStatus: newStatus } })).unwrap();
                                            await dispatch(fetchTeachers());
                                        },
                                        successTitle: 'Salary status updated',
                                        successText: `${row.name}'s salary status is now ${newStatus}.`,
                                        errorFallback: `Failed to update ${row.name}'s salary status.`,
                                    }).catch(() => {});
                                }}
                            />
                        </div>
                    </PersonCard>
                )}
            />

            <SlideOver
                open={slideOver.open}
                onClose={closeSlideOver}
                footer={
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={closeSlideOver}
                            className="flex-1 rounded-2xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                        >
                            Close
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                const id = slideOver.instructor?.id;
                                if (!id) return;
                                closeSlideOver();
                                navigate(`/admin/instructor-management/instructors/${id}`, { state: { instructor: slideOver.instructor } });
                            }}
                            className="flex-1 rounded-2xl bg-[#FF6B35] py-2.5 text-sm font-semibold text-white transition hover:bg-[#fd5a1f]"
                        >
                            View Full Profile →
                        </button>
                    </div>
                }
            >
                {renderInstructorSlide()}
            </SlideOver>
        </div>
    );
};

export default Instructor;
