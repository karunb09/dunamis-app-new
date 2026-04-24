import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getUserById, updateUser, changePassword } from "../../../redux/User/UserSlice";
import { FaEye, FaEyeSlash, FaCamera, FaTrash, FaLock, FaUser, FaEnvelope, FaPhone, FaTimes } from "react-icons/fa";
import PaymentDetails from "./Payment";
import Certificates from "./Certificates";
import toast from "react-hot-toast";
import { resolveImageUrl } from "../../../utils/resolveImageUrl";
import ProfileImageCropper from "../../../components/ProfileImageCropper";

const fieldStyle = {
  fontFamily: "Poppins, sans-serif",
  fontWeight: 400,
  fontSize: 14,
  lineHeight: "1.4",
  letterSpacing: "-0.2px",
};

const labelStyle = { ...fieldStyle, fontWeight: 600, fontSize: 13 };

const getInitials = (name = "", email = "") => {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return String(email || "U").slice(0, 2).toUpperCase();
};

function ProfileField({ label, value, editing, onChange, type = "text", icon: Icon, showPassword, onTogglePassword }) {
  return (
    <div className="border rounded-xl p-4 flex items-center gap-3 bg-gray-50">
      {Icon && <Icon className="text-gray-500 flex-shrink-0" size={18} />}
      <div className="flex-1 min-w-0">
        <p style={{ ...labelStyle, color: "#999" }} className="mb-1">{label}</p>
        {editing ? (
          <div className="relative">
            <input
              type={type === "password" && !showPassword ? "password" : "text"}
              value={value}
              onChange={onChange}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={fieldStyle}
            />
            {type === "password" && (
              <button
                type="button"
                onClick={onTogglePassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition cursor-pointer"
              >
                {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <p style={fieldStyle}>
              {type === "password" ? "•".repeat(10) : value}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ChangePasswordModal({ isOpen, onClose, onSubmit, isLoading }) {
  const [form, setForm] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const [show, setShow] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleShow = (field) => {
    setShow((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.current) {
      toast.error("Please enter your current password");
      return;
    }

    if (!form.new) {
      toast.error("Please enter new password");
      return;
    }

    if (form.new.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    if (!form.confirm) {
      toast.error("Please confirm your new password");
      return;
    }

    if (form.new !== form.confirm) {
      toast.error("Passwords do not match");
      return;
    }

    console.log("📤 Sending to backend:");
    console.log("Old Password:", form.current);
    console.log("New Password:", form.new);

    onSubmit(form.current, form.new);

    setForm({ current: "", new: "", confirm: "" });
    setShow({ current: false, new: false, confirm: false });
  };

  const handleClose = () => {
    setForm({ current: "", new: "", confirm: "" });
    setShow({ current: false, new: false, confirm: false });
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md border border-gray-200">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <FaLock className="text-gray-700" size={16} />
            </div>
            <h2 className="text-base font-semibold text-gray-900">Change Password</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition"
            disabled={isLoading}
          >
            <FaTimes size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="current" className="block text-sm font-medium text-gray-700 mb-1">
              Current Password
            </label>
            <div className="relative">
              <input
                id="current"
                name="current"
                type={show.current ? "text" : "password"}
                value={form.current}
                onChange={handleChange}
                placeholder="Enter your current password"
                className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                autoComplete="off"
                disabled={isLoading}
              />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => toggleShow("current")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                disabled={isLoading}
              >
                {show.current ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="new" className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                id="new"
                name="new"
                type={show.new ? "text" : "password"}
                value={form.new}
                onChange={handleChange}
                placeholder="Enter new password"
                className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                autoComplete="off"
                disabled={isLoading}
              />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => toggleShow("new")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                disabled={isLoading}
              >
                {show.new ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                id="confirm"
                name="confirm"
                type={show.confirm ? "text" : "password"}
                value={form.confirm}
                onChange={handleChange}
                placeholder="Re-enter new password"
                className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                autoComplete="off"
                disabled={isLoading}
              />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => toggleShow("confirm")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                disabled={isLoading}
              >
                {show.confirm ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition text-sm font-medium text-gray-700"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-black text-white rounded-xl hover:bg-gray-900 transition text-sm font-medium disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? "Changing..." : "Change Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const dispatch = useDispatch();
  const { selectedUser, loading } = useSelector((state) => state.user);

  const [tab, setTab] = useState("profile");
  const [editingMode, setEditingMode] = useState(null);
  const [fields, setFields] = useState({ fullName: "", email: "", mobile: "", password: "", image: "" });
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [pendingCropFile, setPendingCropFile] = useState(null);
  const [userId, setUserId] = useState(null);
  const [token, setToken] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    const authToken = localStorage.getItem("token");
    if (userData) {
      const parsedData = JSON.parse(userData);
      const id = parsedData._id || parsedData.id;
      setUserId(id);
      setToken(authToken);
      dispatch(getUserById({ id, token: authToken }));
    }
  }, [dispatch]);

  useEffect(() => {
    if (selectedUser) {
      const fullName = `${selectedUser.name?.firstName || ""} ${selectedUser.name?.lastName || ""}`.trim();
      setFields({
        fullName,
        email: selectedUser.email || "",
        mobile: selectedUser.mobileNo || "",
        password: selectedUser.password || "",
        image: selectedUser.image || "",
      });
      setImageRemoved(false);
      setImageLoadFailed(false);
      setImageFile(null);
      setImagePreview(null);
      setShowPasswordField(false);
    }
  }, [selectedUser]);

  const handleImageFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image size should be less than 5MB"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Please select a valid image file"); return; }
    setPendingCropFile(file);
  };

  const handleCropApply = (croppedFile, previewUrl) => {
    if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImageFile(croppedFile);
    setImagePreview(previewUrl);
    setImageLoadFailed(false);
    setImageRemoved(false);
    setPendingCropFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.success("Cropped profile image ready");
  };

  const handleCropCancel = () => {
    setPendingCropFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const saveDetails = async () => {
    if (!userId || !token) { toast.error("User ID or token not found. Please login again."); return; }
    if (!fields.email?.includes("@")) { toast.error("Please enter a valid email"); return; }
    if (!fields.mobile || fields.mobile.length < 10) { toast.error("Please enter a valid mobile number"); return; }

    setIsSaving(true);
    try {
      const [firstName, ...lastNameParts] = fields.fullName.trim().split(" ");
      const formData = new FormData();
      formData.append("firstName", firstName || "");
      formData.append("lastName", lastNameParts.join(" ") || "");
      formData.append("email", fields.email);
      formData.append("mobileNo", fields.mobile);
      if (imageFile) formData.append("profileImage", imageFile);
      if (imageRemoved) formData.append("removeImage", "true");

      const result = await dispatch(updateUser({ id: userId, userData: formData, token })).unwrap();
      toast.success("Profile updated!");

      const updatedProfile = {
        fullName: `${result.user.name.firstName || ""} ${result.user.name.lastName || ""}`.trim(),
        email: result.user.email,
        mobile: result.user.mobileNo,
        password: result.user.password || "",
        image: result.user.image || "",
      };
      setFields(updatedProfile);
      setImageLoadFailed(false);

      const storedUser = JSON.parse(localStorage.getItem("user"));
      const persistedUser = {
        ...storedUser,
        name: result.user.name,
        email: result.user.email,
        mobileNo: result.user.mobileNo,
        password: result.user.password,
        image: result.user.image,
      };
      localStorage.setItem("user", JSON.stringify(persistedUser));
      sessionStorage.setItem("user", JSON.stringify(persistedUser));

      setImageFile(null);
      setImagePreview(null);
      setImageRemoved(false);
      setEditingMode(null);
      setShowPasswordField(false);
      setTimeout(() => dispatch(getUserById({ id: userId, token })), 500);
    } catch (error) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const cancelEdit = () => {
    if (selectedUser) {
      const fullName = `${selectedUser.name?.firstName || ""} ${selectedUser.name?.lastName || ""}`.trim();
      setFields({ fullName, email: selectedUser.email || "", mobile: selectedUser.mobileNo || "", password: selectedUser.password || "", image: selectedUser.image || "" });
    }
    setImageFile(null);
    setImagePreview(null);
    setPendingCropFile(null);
    setImageRemoved(false);
    setImageLoadFailed(false);
    setEditingMode(null);
    setShowPasswordField(false);
  };

  const initials = getInitials(fields.fullName, fields.email);
  const uploadedImage = imageRemoved ? "" : resolveImageUrl(fields.image, "");
  const displayImage = imagePreview || (imageLoadFailed ? "" : uploadedImage);

  if (loading && !selectedUser) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
      </div>
    );
  }

  const NavButton = ({ label, tabName }) => (
    <button
      className={`pb-3 pt-2 border-b-2 transition text-sm ${
        tab === tabName ? "border-gray-900 text-gray-900 font-semibold" : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
      style={labelStyle}
      onClick={() => { setTab(tabName); setEditingMode(null); }}
    >
      {label}
    </button>
  );

  const ActionButton = ({ icon: Icon, label, onClick, variant = "secondary", disabled = false }) => {
    const isBlack = variant === "primary";
    return (
      <button
        className={`flex items-center gap-2 px-5 py-2 rounded-lg transition text-sm font-medium disabled:opacity-50 ${
          isBlack ? "bg-gray-900 text-white hover:bg-black" : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        }`}
        style={fieldStyle}
        onClick={onClick}
        disabled={disabled}
        type="button"
      >
        {Icon && <Icon size={14} />}
        {label}
      </button>
    );
  };

  return (
    <main className="w-full max-w-5xl mx-auto px-4 sm:px-8 py-6" style={fieldStyle}>
      <nav className="flex items-center gap-8 mb-8 border-b border-gray-200 pb-4">
        <NavButton label="Profile" tabName="profile" />
        <NavButton label="Payment Details" tabName="payment" />
        <NavButton label="Certificates" tabName="certificates" />
      </nav>

      {tab === "profile" && (
        <>
          <div className="flex flex-col items-start gap-4 mb-8">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center shadow-sm">
              {displayImage ? (
                <img
                  src={displayImage}
                  alt="Profile"
                  className="w-full h-full object-cover object-top"
                  onError={() => setImageLoadFailed(true)}
                />
              ) : (
                <span className="text-gray-400 text-2xl font-bold" style={labelStyle}>{initials}</span>
              )}
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageFile} className="hidden" />

            <div className="flex gap-2">
              {editingMode === "details" ? (
                <>
                  <ActionButton icon={FaCamera} label="Edit" onClick={() => fileInputRef.current?.click()} />
                  <ActionButton
                    icon={FaTrash}
                    label="Remove Photo"
                    onClick={() => { setImageFile(null); setImagePreview(null); setImageRemoved(true); setFields({ ...fields, image: "" }); }}
                    disabled={!displayImage && !imageFile}
                  />
                </>
              ) : (
                <>
                  <ActionButton icon={FaCamera} label="Edit" disabled />
                  <ActionButton icon={FaTrash} label="Remove Photo" disabled />
                </>
              )}
            </div>
          </div>

          <div>
            <h2 style={labelStyle} className="text-base font-semibold mb-5 text-gray-900">Profile Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <ProfileField label="Full Name" value={fields.fullName} editing={editingMode === "details"} onChange={(e) => setFields({ ...fields, fullName: e.target.value })} icon={FaUser} />
              <ProfileField label="Email Address" value={fields.email} editing={editingMode === "details"} onChange={(e) => setFields({ ...fields, email: e.target.value })} type="email" icon={FaEnvelope} />
              <ProfileField label="Mobile Number" value={fields.mobile} editing={editingMode === "details"} onChange={(e) => setFields({ ...fields, mobile: e.target.value })} icon={FaPhone} />
              {editingMode !== "details" && (
                <ProfileField label="Password" value={fields.password} editing={false} type="password" icon={FaLock} showPassword={showPasswordField} onTogglePassword={() => setShowPasswordField(!showPasswordField)} />
              )}
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3">
              {editingMode === null ? (
                <>
                  <ActionButton icon={FaLock} label="Change Password" onClick={() => setIsPasswordModalOpen(true)} disabled={isSaving || loading} />
                  <ActionButton label="Edit Details" onClick={() => setEditingMode("details")} variant="primary" disabled={isSaving || loading} />
                </>
              ) : (
                <>
                  <ActionButton label="Cancel" onClick={cancelEdit} disabled={isSaving} />
                  <ActionButton label={isSaving ? "Saving..." : "Save"} onClick={saveDetails} variant="primary" disabled={isSaving || loading} />
                </>
              )}
            </div>
          </div>
        </>
      )}

      {tab === "payment" && <PaymentDetails />}
      {tab === "certificates" && <Certificates />}

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSubmit={(old, newPwd) => {
          setIsSaving(true);
          dispatch(changePassword({ oldPassword: old, newPassword: newPwd, token }))
            .unwrap()
            .then((result) => {
              toast.success(result.message || "Password changed successfully!");
              setIsPasswordModalOpen(false);
              dispatch(getUserById({ id: userId, token }));
            })
            .catch((err) => {
              toast.error(err.message || "Failed to change password");
            })
            .finally(() => setIsSaving(false));
        }}
        isLoading={isSaving}
      />
      <ProfileImageCropper
        file={pendingCropFile}
        onApply={handleCropApply}
        onCancel={handleCropCancel}
      />
    </main>
  );
}
