import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAllUsers, updateUser } from "../../../../redux/User/UserSlice";
import toast from "react-hot-toast";
import { FaArchive, FaBan, FaClipboard, FaFilter, FaFlag, FaSearch, FaSortAmountDown, FaUserSlash } from "react-icons/fa";
import { FiX } from "react-icons/fi";
import { getStoredToken } from "../../../../utils/authSession";
import Swal from "sweetalert2";
import ActionProgressBar from "../../../../components/ActionProgressBar";
import { resolveImageUrl } from "../../../../utils/resolveImageUrl";
import DataCards from "../../../../components/DataCards";
import PersonCard from "../../../../components/cards/PersonCard";

const SORT_OPTIONS = [
    { value: "name-asc", label: "Name A-Z" },
    { value: "name-desc", label: "Name Z-A" },
    { value: "date-asc", label: "Registration Date Asc" },
    { value: "date-desc", label: "Registration Date Desc" },
];

const RegisteredStudents = () => {
    const dispatch = useDispatch();
    const [searchTerm, setSearchTerm] = useState('');
    const { users, loading, error, listStatus } = useSelector((state) => state.user);
    const authToken = useSelector((state) => state.auth.token);
    const token = authToken || getStoredToken();

    const [sortOpen, setSortOpen] = useState(false);
    const [sortOption, setSortOption] = useState("");
    const [filterOpen, setFilterOpen] = useState(false);
    const [filters, setFilters] = useState({ status: "", followUp: "", dateFrom: "", dateTo: "" });
    const [processingAction, setProcessingAction] = useState(null);
    const sortRef = useRef(null);

    const getErrorMessage = (error, fallback) => {
        if (typeof error === "string") return error;
        return error?.message || error?.error || error?.data?.message || fallback;
    };

    useEffect(() => {
        if (token && listStatus === "idle") {
            dispatch(getAllUsers(token));
        } else if (!token) {
            toast.error("No token found. Please login.");
        }
    }, [dispatch, listStatus, token]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getImageUrl = (imagePath) => resolveImageUrl(imagePath, "/profile-photo.png");

    let students = Array.isArray(users)
        ? users
            .filter((user) => user.accountType === "student")
            .map((user, index) => ({
                id: user._id,
                studentId: `#STU-${index + 1000}`,
                name: `${user.name?.firstName || ""} ${user.name?.lastName || ""}`,
                email: user.email,
                mobileNumber: user.mobileNo,
                avatar: getImageUrl(user.image),
                registrationDate: new Date(user.createdAt).toLocaleDateString(),
                followUp1: user.followUp1 || "Pending",
                followUp2: user.followUp2 || "Pending",
                followUp3: user.followUp3 || "Pending",
                status: user.status || user.accountStatus || "Active",
                accountStatus: (user.accountStatus || "active").toLowerCase(),
            }))
        : [];

    if (filters.status) students = students.filter((s) => s.status === filters.status);
    if (filters.followUp) students = students.filter(
        (s) => s.followUp1 === filters.followUp || s.followUp2 === filters.followUp || s.followUp3 === filters.followUp
    );
    if (filters.dateFrom) students = students.filter((s) => new Date(s.registrationDate) >= new Date(filters.dateFrom));
    if (filters.dateTo) students = students.filter((s) => new Date(s.registrationDate) <= new Date(filters.dateTo));

    const filteredStudents = students.filter((student) =>
        Object.values(student).some((value) =>
            String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    if (sortOption) {
        switch (sortOption) {
            case "name-asc": filteredStudents.sort((a, b) => a.name.localeCompare(b.name)); break;
            case "name-desc": filteredStudents.sort((a, b) => b.name.localeCompare(a.name)); break;
            case "date-asc": filteredStudents.sort((a, b) => new Date(a.registrationDate) - new Date(b.registrationDate)); break;
            case "date-desc": filteredStudents.sort((a, b) => new Date(b.registrationDate) - new Date(a.registrationDate)); break;
        }
    }

    const handleCopyDetails = (selectedRows) => {
        const details = selectedRows
            .map(
                (s) => `Name: ${s.name}
ID: ${s.studentId}
Email: ${s.email}
Mobile: ${s.mobileNumber}
Registration Date: ${s.registrationDate}
Follow-up 1: ${s.followUp1}
Follow-up 2: ${s.followUp2}
Follow-up 3: ${s.followUp3}`
            )
            .join("\n\n---\n\n");
        navigator.clipboard.writeText(details)
            .then(() => toast.success("Student details copied to clipboard!"))
            .catch(() => toast.error("Failed to copy details!"));
    };

    const handleStudentAction = async (row, actionLabel) => {
        const actionKey = `${row.id}-${actionLabel.toLowerCase()}`;
        setProcessingAction({
            key: actionKey,
            label: `${actionLabel} request for ${row.name} is being processed...`,
        });
        const toastId = toast.loading(`${actionLabel} request started for ${row.name}`);

        try {
            if (actionLabel === "Disable") {
                const nextStatus = row.accountStatus === "active" ? "inactive" : "active";
                await dispatch(updateUser({
                    id: row.id,
                    userData: { accountStatus: nextStatus },
                    token,
                })).unwrap();
                await dispatch(getAllUsers(token));
                toast.dismiss(toastId);
                await Swal.fire({
                    icon: "success",
                    title: "Student status updated",
                    text: `${row.name} is now ${nextStatus === "active" ? "enabled" : "disabled"}.`,
                    confirmButtonColor: "#0f172a",
                });
                return;
            }
            await new Promise((resolve) => setTimeout(resolve, 900));
            toast.dismiss(toastId);
            await Swal.fire({
                icon: "info",
                title: `${actionLabel} not available yet`,
                text: `${actionLabel} for ${row.name} is not connected to the backend yet.`,
                confirmButtonColor: "#0f172a",
            });
        } catch (error) {
            toast.dismiss(toastId);
            await Swal.fire({
                icon: "error",
                title: "Action failed",
                text: getErrorMessage(error, `We could not process ${actionLabel.toLowerCase()} for ${row.name}.`),
                confirmButtonColor: "#dc2626",
            });
        } finally {
            setProcessingAction(null);
        }
    };

    const clearFilters = () => setFilters({ status: "", followUp: "", dateFrom: "", dateTo: "" });
    const activeFilterCount = Object.values(filters).filter(Boolean).length;

    return (
        <div>
            {loading && <p className="mb-4 text-sm text-slate-500">Loading users…</p>}
            {error && <p className="mb-4 text-sm text-rose-500">Error: {error}</p>}
            <ActionProgressBar active={Boolean(processingAction)} label={processingAction?.label} />

            {/* Toolbar */}
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:w-72">
                    <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                    <input
                        type="text"
                        placeholder="Search students…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative" ref={sortRef}>
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
                            <div className="absolute right-0 z-40 mt-2 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
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
                        <h2 className="mt-1 text-lg font-bold text-slate-900">Filter Students</h2>

                        <div className="mt-5 space-y-4">
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Status</label>
                                <select
                                    value={filters.status || ""}
                                    onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                >
                                    <option value="">All</option>
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Follow-up</label>
                                <select
                                    value={filters.followUp || ""}
                                    onChange={(e) => setFilters((f) => ({ ...f, followUp: e.target.value }))}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                >
                                    <option value="">All</option>
                                    <option value="Complete">Complete</option>
                                    <option value="Pending">Pending</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Registration From</label>
                                <input
                                    type="date"
                                    value={filters.dateFrom || ""}
                                    onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Registration To</label>
                                <input
                                    type="date"
                                    value={filters.dateTo || ""}
                                    onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button
                                type="button"
                                onClick={clearFilters}
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
                data={filteredStudents}
                itemsPerPage={12}
                emptyMessage="No registered students found."
                onCopyDetails={handleCopyDetails}
                renderCard={(row, { selected, onSelect }) => (
                    <PersonCard
                        avatarSrc={row.avatar || undefined}
                        name={row.name}
                        subtitle={row.email}
                        statusBadge={
                            row.accountStatus === "active"
                                ? { label: "Active", className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", dot: true, dotClass: "bg-emerald-500" }
                                : { label: "Inactive", className: "bg-rose-50 text-rose-700 ring-1 ring-rose-200", dot: true, dotClass: "bg-rose-500" }
                        }
                        meta={[
                            { label: "Student ID", value: row.studentId },
                            { label: "Mobile", value: row.mobileNumber || "N/A" },
                            { label: "Registered", value: row.registrationDate },
                            { label: "Follow-up", value: row.followUp1 },
                        ]}
                        onView={() => handleCopyDetails([row])}
                        primaryLabel="Copy Details"
                        menuItems={[
                            {
                                label: "Block",
                                icon: <FaBan size={13} />,
                                disabled: Boolean(processingAction),
                                onClick: () => handleStudentAction(row, "Block"),
                            },
                            {
                                label: row.accountStatus === "active" ? "Disable" : "Enable",
                                icon: <FaUserSlash size={13} />,
                                disabled: Boolean(processingAction),
                                onClick: () => handleStudentAction(row, "Disable"),
                            },
                            {
                                label: "Archive",
                                icon: <FaArchive size={13} />,
                                disabled: Boolean(processingAction),
                                onClick: () => handleStudentAction(row, "Archive"),
                            },
                            {
                                label: "Report",
                                icon: <FaFlag size={13} />,
                                disabled: Boolean(processingAction),
                                onClick: () => handleStudentAction(row, "Report"),
                            },
                        ]}
                        selected={selected}
                        onSelect={onSelect}
                    />
                )}
            />
        </div>
    );
};

export default RegisteredStudents;
