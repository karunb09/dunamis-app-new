import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { changePassword, resetUserState } from "../redux/User/UserSlice";
import toast from "react-hot-toast";
import { PiXBold, PiLockKeyDuotone } from "react-icons/pi";

const ChangePasswordModal = ({ isOpen, onClose }) => {
    const dispatch = useDispatch();
    const { loading } = useSelector((state) => state.user);
    const token = localStorage.getItem("token");

    const [formData, setFormData] = useState({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    const [showPasswords, setShowPasswords] = useState({
        old: false,
        new: false,
        confirm: false,
    });

    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        if (errors[name]) {
            setErrors({ ...errors, [name]: "" });
        }
    };

    const togglePasswordVisibility = (field) => {
        setShowPasswords({ ...showPasswords, [field]: !showPasswords[field] });
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.oldPassword) {
            newErrors.oldPassword = "Old password is required";
        }

        if (!formData.newPassword) {
            newErrors.newPassword = "New password is required";
        } else if (formData.newPassword.length < 6) {
            newErrors.newPassword = "Password must be at least 6 characters";
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword = "Please confirm your password";
        } else if (formData.newPassword !== formData.confirmPassword) {
            newErrors.confirmPassword = "Passwords do not match";
        }

        if (formData.oldPassword && formData.newPassword && formData.oldPassword === formData.newPassword) {
            newErrors.newPassword = "New password must be different from old password";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            await dispatch(
                changePassword({
                    oldPassword: formData.oldPassword,
                    newPassword: formData.newPassword,
                    token,
                })
            ).unwrap();

            toast.success("Password changed successfully!");
            setFormData({ oldPassword: "", newPassword: "", confirmPassword: "" });
            setErrors({});
            dispatch(resetUserState());
            onClose();
        } catch (error) {
            toast.error(error.message || "Failed to change password");
        }
    };

    const handleClose = () => {
        setFormData({ oldPassword: "", newPassword: "", confirmPassword: "" });
        setErrors({});
        setShowPasswords({ old: false, new: false, confirm: false });
        dispatch(resetUserState());
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-3 py-4 backdrop-blur-sm sm:items-center sm:px-4">
            <div className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-xl">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center">
                            <PiLockKeyDuotone className="text-gray-700 text-base" />
                        </div>
                        <h2 className="text-base font-medium text-gray-900">Change Password</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 transition"
                    >
                        <PiXBold size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Old Password */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">
                            Current Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPasswords.old ? "text" : "password"}
                                name="oldPassword"
                                value={formData.oldPassword}
                                onChange={handleChange}
                                className={`w-full px-3 py-2.5 pr-10 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white ${errors.oldPassword ? "border-red-500" : "border-gray-300"
                                    }`}
                                placeholder="Enter current password"
                            />
                            <button
                                type="button"
                                onClick={() => togglePasswordVisibility("old")}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPasswords.old ? (
                                    <FaEyeSlash className="text-sm" />
                                ) : (
                                    <FaEye className="text-sm" />
                                )}
                            </button>
                        </div>
                        {errors.oldPassword && (
                            <p className="text-red-500 text-[11px] mt-1">{errors.oldPassword}</p>
                        )}
                    </div>

                    {/* New Password */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">
                            New Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPasswords.new ? "text" : "password"}
                                name="newPassword"
                                value={formData.newPassword}
                                onChange={handleChange}
                                className={`w-full px-3 py-2.5 pr-10 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white ${errors.newPassword ? "border-red-500" : "border-gray-300"
                                    }`}
                                placeholder="Enter new password"
                            />
                            <button
                                type="button"
                                onClick={() => togglePasswordVisibility("new")}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPasswords.new ? (
                                    <FaEyeSlash className="text-sm" />
                                ) : (
                                    <FaEye className="text-sm" />
                                )}
                            </button>
                        </div>
                        {errors.newPassword && (
                            <p className="text-red-500 text-[11px] mt-1">{errors.newPassword}</p>
                        )}
                        <p className="text-gray-500 text-[11px] mt-1">
                            Must be at least 6 characters
                        </p>
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">
                            Confirm New Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPasswords.confirm ? "text" : "password"}
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className={`w-full px-3 py-2.5 pr-10 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white ${errors.confirmPassword ? "border-red-500" : "border-gray-300"
                                    }`}
                                placeholder="Confirm new password"
                            />
                            <button
                                type="button"
                                onClick={() => togglePasswordVisibility("confirm")}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPasswords.confirm ? (
                                    <FaEyeSlash className="text-sm" />
                                ) : (
                                    <FaEye className="text-sm" />
                                )}
                            </button>
                        </div>
                        {errors.confirmPassword && (
                            <p className="text-red-500 text-[11px] mt-1">{errors.confirmPassword}</p>
                        )}
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-3">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-2xl hover:bg-gray-50 transition text-sm font-medium text-gray-700"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2.5 bg-black text-white rounded-2xl hover:bg-gray-800 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={loading}
                        >
                            {loading ? "Changing..." : "Change Password"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChangePasswordModal;
