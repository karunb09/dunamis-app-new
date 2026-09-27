import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { createAdmin, fetchAdminById, fetchAdmins, updateAdmin } from "../../redux/Admin/AdminSlice";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import axiosAuth from "../../utils/axiosAuth";
import OrgPlacementFields from "../../components/org/OrgPlacementFields";
import { emptyPlacement, placementProblem, toPlacementPayload } from "../../utils/orgPlacement";
import {
    SCOPE_KEYS,
    jobTitleOptions,
    suggestedEmployeePrefix,
} from "../../constants/orgStructure";

const BASE_URL = import.meta.env.VITE_BASE_URL;

const EMPLOYEE_PREFIX_OPTIONS = [
    { value: "DMPL", label: "DMPL — Central Office" },
    { value: "DSMA", label: "DSMA — DSM Admin" },
    { value: "DSMB", label: "DSMB — DSM BD" },
    { value: "DSDA", label: "DSDA — DSD Admin" },
    { value: "DSDB", label: "DSDB — DSD BD" },
    { value: "DCCA", label: "DCCA — DCC Admin" },
    { value: "DCCB", label: "DCCB — DCC BD" },
];

const AddAdminForm = () => {
    const { id } = useParams();
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        mobileNo: "",
        email: "",
        role: "",
        employeePrefix: "DSMA",
        employeeId: "",
        dateOfJoining: "",
        dateOfBirth: "",
        emergencyName: "",
        emergencyRelation: "",
        emergencyPhone: "",
        address: "",
        permissions: {
            allAccess: false,
            courseManagement: false,
            contentManagement: false,
            websiteContent: false,
            categoryManagement: false,
            studentManagement: false,
            instructorManagement: false,
            adminManagement: false,
            offlineCenters: false,
            financials: false,
            enquiries: false,
            updates: false,
            referralManagement: false,
            reports: false,
        },
    });
    const [adminUserId, setAdminUserId] = useState("");
    const [initialEmployeeId, setInitialEmployeeId] = useState("");
    const [placement, setPlacement] = useState(emptyPlacement);
    // Once someone types their own job title, designation changes stop overwriting it.
    const [titleTouched, setTitleTouched] = useState(false);

    const [loading, setLoading] = useState(false);

    const permissionsList = [
        { key: "allAccess", label: "All Access" },
        { key: "courseManagement", label: "Course Management" },
        { key: "contentManagement", label: "Content Management" },
        { key: "websiteContent", label: "Website Content" },
        { key: "categoryManagement", label: "Category Management" },
        { key: "studentManagement", label: "Student Management" },
        { key: "instructorManagement", label: "Instructor Management" },
        { key: "adminManagement", label: "Admin Management" },
        { key: "offlineCenters", label: "Offline Centers" },
        { key: "financials", label: "Financials" },
        { key: "enquiries", label: "Enquiries" },
        { key: "updates", label: "Updates" },
        { key: "referralManagement", label: "Referral Management" },
        { key: "reports", label: "Reports & Insights" },
    ];

    useEffect(() => {
        if (id) {
            setLoading(true);
            dispatch(fetchAdminById(id))
                .unwrap()
                .then((res) => {
                    const admin = res.data || res;
                    const user = admin.userId;

                    const loadedPermissions = {};
                    permissionsList.forEach(({ key }) => {
                        loadedPermissions[key] = admin.permission?.includes(key) || false;
                    });

                    setFormData({
                        firstName: user.name?.firstName || "",
                        lastName: user.name?.lastName || "",
                        mobileNo: user.mobileNo?.toString() || "",
                        email: user.email || "",
                        role: admin.role || "",
                        employeePrefix: "DSMA",
                        employeeId: user.employeeId || "",
                        dateOfJoining: admin.dateOfJoining?.slice(0, 10) || "",
                        dateOfBirth: admin.dateOfBirth?.slice(0, 10) || "",
                        emergencyName: admin.emergencyContact?.name || "",
                        emergencyRelation: admin.emergencyContact?.relation || "",
                        emergencyPhone: admin.emergencyContact?.phone || "",
                        address: admin.address || "",
                        permissions: loadedPermissions,
                    });
                    setAdminUserId(user._id || "");
                    setInitialEmployeeId(user.employeeId || "");
                    const org = user.org || {};
                    setPlacement({
                        ...emptyPlacement(),
                        designation: org.designation || "",
                        workMode: org.workMode || "offline",
                        reportsTo: org.reportsTo || "",
                        ...Object.fromEntries(SCOPE_KEYS.map((key) => [key, org[key] || []])),
                    });
                    setTitleTouched(Boolean(admin.role));
                })
                .catch((error) => {
                    console.error("Error loading admin:", error);
                    toast.error("Failed to load admin details");
                })
                .finally(() => setLoading(false));
        }
    }, [dispatch, id]);

    const handleChange = (e) => {
        const { name, type, checked, value } = e.target;

        if (type === "checkbox") {
            setFormData((prev) => ({
                ...prev,
                permissions: {
                    ...prev.permissions,
                    [name]: checked,
                },
            }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handlePlacementChange = (next) => {
        setPlacement(next);
        const [suggestedTitle] = jobTitleOptions(next.designation, next.workMode);
        setFormData((prev) => ({
            ...prev,
            role: titleTouched || !suggestedTitle ? prev.role : suggestedTitle,
            employeePrefix: id ? prev.employeePrefix : suggestedEmployeePrefix(next.designation, prev.employeePrefix),
        }));
    };

    const handleSelectAll = (selectAll) => {
        const updatedPermissions = {};
        permissionsList.forEach(({ key }) => {
            updatedPermissions[key] = selectAll;
        });
        setFormData((prev) => ({
            ...prev,
            permissions: updatedPermissions,
        }));
    };

    const validateForm = () => {
        if (!formData.firstName.trim()) {
            toast.error("First name is required");
            return false;
        }
        if (!formData.lastName.trim()) {
            toast.error("Last name is required");
            return false;
        }
        if (!formData.email.trim()) {
            toast.error("Email is required");
            return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
            toast.error("Enter a valid email address");
            return false;
        }
        if (!formData.mobileNo.trim()) {
            toast.error("Mobile number is required");
            return false;
        }
        if (!/^\d{10}$/.test(formData.mobileNo.trim())) {
            toast.error("Mobile number must be 10 digits");
            return false;
        }
        const problem = placementProblem(placement);
        if (problem) {
            toast.error(problem);
            return false;
        }
        if (!formData.role.trim()) {
            toast.error("Job title is required");
            return false;
        }
        if (!id && !formData.dateOfJoining) {
            toast.error("Date of joining is required");
            return false;
        }
        if (formData.emergencyPhone.trim() && !/^\d{10}$/.test(formData.emergencyPhone.trim())) {
            toast.error("Emergency contact phone must be 10 digits");
            return false;
        }

        const hasAnyPermission = Object.values(formData.permissions).some((p) => p);
        if (!hasAnyPermission) {
            toast.error("Please select at least one permission");
            return false;
        }

        return true;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        const formDataWithName = {
            name: {
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
            },
            mobileNo: formData.mobileNo.trim(),
            email: formData.email.trim().toLowerCase(),
            role: formData.role.trim(),
            permission: Object.keys(formData.permissions).filter(
                (key) => formData.permissions[key]
            ),
            org: toPlacementPayload(placement),
            ...(formData.dateOfJoining ? { dateOfJoining: formData.dateOfJoining } : {}),
            dateOfBirth: formData.dateOfBirth,
            emergencyContact: {
                name: formData.emergencyName.trim(),
                relation: formData.emergencyRelation.trim(),
                phone: formData.emergencyPhone.trim(),
            },
            address: formData.address.trim(),
        };

        setLoading(true);

        if (id) {
            const newEmployeeId = formData.employeeId.trim().toUpperCase();
            dispatch(updateAdmin({ id, adminData: formDataWithName }))
                .unwrap()
                .then(async () => {
                    if (adminUserId && newEmployeeId && newEmployeeId !== initialEmployeeId) {
                        try {
                            await axiosAuth.patch(`${BASE_URL}/user/${adminUserId}/employee-id`, {
                                employeeId: newEmployeeId,
                            });
                        } catch (patchError) {
                            const data = patchError.response?.data;
                            toast.error(
                                [data?.message || "Failed to update employee ID.", data?.hint]
                                    .filter(Boolean)
                                    .join(" ")
                            );
                        }
                    }
                    dispatch(fetchAdmins());
                    toast.success("Admin updated successfully!");
                    navigate("/admin/admin-management", { replace: true });
                })
                .catch((error) => {
                    console.error("Error updating admin:", error);
                    toast.error(
                        (typeof error === "string" ? error : error?.message) ||
                            "Error updating admin. Please try again."
                    );
                })
                .finally(() => setLoading(false));
        } else {
            dispatch(createAdmin({ ...formDataWithName, employeePrefix: formData.employeePrefix }))
                .unwrap()
                .then((res) => {
                    const employeeId = res?.userId?.employeeId;
                    toast.success(
                        employeeId
                            ? `Admin created successfully (${employeeId})!`
                            : "Admin created successfully!"
                    );
                    navigate("/admin/admin-management", { replace: true });
                })
                .catch((error) => {
                    console.error("Error creating admin:", error);
                    toast.error(
                        (typeof error === "string" ? error : error?.message) ||
                            "Error creating admin. Please try again."
                    );
                })
                .finally(() => setLoading(false));
        }
    };

    const handleCancel = () => {
        navigate("/admin/admin-management");
    };

    if (loading && id) {
        return (
            <div className="max-w-7xl mx-auto bg-gray-100 p-6 rounded-xl shadow">
                <p className="text-center text-gray-500">Loading admin details...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto bg-gray-100 p-6 rounded-xl shadow">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">
                    {id ? "Edit Admin" : "Create New Admin"}
                </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-white p-6 rounded-xl border">
                    <h3 className="font-semibold mb-4 text-lg">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                First Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="firstName"
                                placeholder="Enter first name"
                                value={formData.firstName}
                                onChange={handleChange}
                                className="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Last Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="lastName"
                                placeholder="Enter last name"
                                value={formData.lastName}
                                onChange={handleChange}
                                className="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Mobile Number <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="tel"
                                name="mobileNo"
                                placeholder="Enter 10-digit mobile number"
                                value={formData.mobileNo}
                                onChange={handleChange}
                                maxLength={10}
                                className="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Email <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="email"
                                name="email"
                                placeholder="Enter email address"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border">
                    <h3 className="font-semibold mb-1 text-lg">Personal & HR</h3>
                    <p className="mb-4 text-sm text-slate-500">
                        Private: shown on this form and the admin's own profile only.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Date of joining {!id && <span className="text-red-500">*</span>}
                            </label>
                            <input
                                type="date"
                                name="dateOfJoining"
                                value={formData.dateOfJoining}
                                onChange={handleChange}
                                className="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Date of birth</label>
                            <input
                                type="date"
                                name="dateOfBirth"
                                value={formData.dateOfBirth}
                                max={new Date().toISOString().slice(0, 10)}
                                onChange={handleChange}
                                className="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Emergency contact name</label>
                            <input
                                type="text"
                                name="emergencyName"
                                value={formData.emergencyName}
                                onChange={handleChange}
                                className="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Relation</label>
                                <input
                                    type="text"
                                    name="emergencyRelation"
                                    placeholder="e.g. Spouse"
                                    value={formData.emergencyRelation}
                                    onChange={handleChange}
                                    className="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Their phone</label>
                                <input
                                    type="tel"
                                    name="emergencyPhone"
                                    maxLength={10}
                                    value={formData.emergencyPhone}
                                    onChange={handleChange}
                                    className="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-2">Address</label>
                            <textarea
                                name="address"
                                rows={2}
                                value={formData.address}
                                onChange={handleChange}
                                className="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border">
                    <h3 className="font-semibold mb-1 text-lg">Organisation</h3>
                    <p className="mb-4 text-sm text-slate-500">
                        Where they sit in the org chart. Messages about a learner go to the AA and BDE responsible for that learner's branch or course.
                    </p>
                    <OrgPlacementFields value={placement} onChange={handlePlacementChange} targetUserId={adminUserId} />

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Job title <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="role"
                                list="admin-job-titles"
                                placeholder="e.g. Tele Caller, Branch Manager"
                                value={formData.role}
                                onChange={(e) => {
                                    setTitleTouched(true);
                                    handleChange(e);
                                }}
                                className="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                            <datalist id="admin-job-titles">
                                {jobTitleOptions(placement.designation, placement.workMode).map((title) => (
                                    <option key={title} value={title} />
                                ))}
                            </datalist>
                        </div>
                        {id ? (
                            <div>
                                <label className="block text-sm font-medium mb-2">Employee ID</label>
                                <input
                                    type="text"
                                    name="employeeId"
                                    placeholder="e.g. DSMA001"
                                    value={formData.employeeId}
                                    onChange={handleChange}
                                    className="w-full p-3 border rounded-2xl font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium mb-2">Employee ID Prefix</label>
                                <select
                                    name="employeePrefix"
                                    value={formData.employeePrefix}
                                    onChange={handleChange}
                                    className="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {EMPLOYEE_PREFIX_OPTIONS.map(({ value, label }) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                                <p className="mt-1 text-xs text-gray-500">
                                    The employee ID (e.g. {formData.employeePrefix}001) is generated from this prefix.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-lg">
                            Permissions <span className="text-red-500">*</span>
                        </h3>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => handleSelectAll(true)}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                                Select All
                            </button>
                            <span className="text-gray-400">|</span>
                            <button
                                type="button"
                                onClick={() => handleSelectAll(false)}
                                className="text-sm text-red-600 hover:text-red-800 font-medium"
                            >
                                Clear All
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {permissionsList.map(({ key, label }) => (
                            <label
                                key={key}
                                className={`flex items-center p-3 border rounded-2xl cursor-pointer transition ${formData.permissions[key]
                                        ? "bg-blue-50 border-blue-500"
                                        : "bg-white border-gray-300 hover:border-gray-400"
                                    }`}
                            >
                                <input
                                    type="checkbox"
                                    name={key}
                                    checked={formData.permissions[key]}
                                    onChange={handleChange}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="ml-3 text-sm font-medium">{label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-2xl hover:bg-gray-50 transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-6 py-3 bg-black text-white rounded-2xl hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={loading}
                    >
                        {loading
                            ? id
                                ? "Updating..."
                                : "Creating..."
                            : id
                                ? "Update Admin"
                                : "Create Admin"}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddAdminForm;
