import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { createAdmin, fetchAdminById, updateAdmin } from "../../redux/Admin/AdminSlice";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

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
        accessLevel: "",
        department: "",
        permissions: {
            allAccess: false,
            courseManagement: false,
            contentManagement: false,
            categoryManagement: false,
            studentManagement: false,
            instructorManagement: false,
            adminManagement: false,
            offlineCenters: false,
            financials: false,
            enquiries: false,
            updates: false,
        },
    });

    const [loading, setLoading] = useState(false);

    const permissionsList = [
        { key: "allAccess", label: "All Access" },
        { key: "courseManagement", label: "Course Management" },
        { key: "contentManagement", label: "Content Management" },
        { key: "categoryManagement", label: "Category Management" },
        { key: "studentManagement", label: "Student Management" },
        { key: "instructorManagement", label: "Instructor Management" },
        { key: "adminManagement", label: "Admin Management" },
        { key: "offlineCenters", label: "Offline Centers" },
        { key: "financials", label: "Financials" },
        { key: "enquiries", label: "Enquiries" },
        { key: "updates", label: "Updates" },
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
                        accessLevel: admin.accessLevel || "",
                        department: admin.department || "",
                        permissions: loadedPermissions,
                    });
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
        if (!formData.role.trim()) {
            toast.error("Role is required");
            return false;
        }
        if (!formData.accessLevel) {
            toast.error("Access level is required");
            return false;
        }
        if (!formData.department.trim()) {
            toast.error("Department is required");
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
            accessLevel: formData.accessLevel,
            permission: Object.keys(formData.permissions).filter(
                (key) => formData.permissions[key]
            ),
            department: formData.department.trim(),
        };

        setLoading(true);

        if (id) {
            dispatch(updateAdmin({ id, adminData: formDataWithName }))
                .unwrap()
                .then(() => {
                    toast.success("Admin updated successfully!");
                    navigate("/admin/admin-management", { replace: true });
                })
                .catch((error) => {
                    console.error("Error updating admin:", error);
                    toast.error(error.message || "Error updating admin. Please try again.");
                })
                .finally(() => setLoading(false));
        } else {
            dispatch(createAdmin(formDataWithName))
                .unwrap()
                .then(() => {
                    toast.success("Admin created successfully!");
                    navigate("/admin/admin-management", { replace: true });
                })
                .catch((error) => {
                    console.error("Error creating admin:", error);
                    toast.error(error.message || "Error creating admin. Please try again.");
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
                    <h3 className="font-semibold mb-4 text-lg">Role & Access</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Role <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="role"
                                placeholder="e.g., Manager, Supervisor"
                                value={formData.role}
                                onChange={handleChange}
                                className="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Access Level <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="accessLevel"
                                value={formData.accessLevel}
                                onChange={handleChange}
                                className="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="">Select Access Level</option>
                                <option value="level 1">Level 1</option>
                                <option value="level 2">Level 2</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Department <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="department"
                                placeholder="e.g., Operations, Academic"
                                value={formData.department}
                                onChange={handleChange}
                                className="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
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
