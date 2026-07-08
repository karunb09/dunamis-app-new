import React, { useState, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { FiCamera, FiEdit2, FiMail, FiMapPin, FiPhone, FiUser } from "react-icons/fi";
import { updateUser } from "../../redux/User/UserSlice";
import toast from "react-hot-toast";
import { DEFAULT_AVATAR, resolveImageUrl } from "../../utils/resolveImageUrl";
import ProfileImageCropper from "../../components/ProfileImageCropper";
const FIELD_INPUT = "w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

const PersonalInfo = ({ user, loading }) => {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);

  const [editMode, setEditMode] = useState(false);
  const [profile, setProfile] = useState({
    firstName: "", lastName: "", email: "", mobile: "",
    bio: "", location: "", image: "",
  });
  const [editForm, setEditForm] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [pendingCropFile, setPendingCropFile] = useState(null);

  useEffect(() => {
    if (user) {
      const data = {
        firstName: user.name?.firstName || "",
        lastName: user.name?.lastName || "",
        email: user.email || "",
        mobile: user.mobileNo || "",
        bio: user.bio || "",
        location: user.location || "",
        image: user.image || "",
      };
      setProfile(data);
      setEditForm(data);
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5 MB"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Please select a valid image file"); return; }
    setPendingCropFile(file);
  };

  const handleCropApply = (croppedFile, previewUrl) => {
    if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImageFile(croppedFile);
    setImagePreview(previewUrl);
    setPendingCropFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCropCancel = () => {
    setPendingCropFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCancelEdit = () => {
    setEditForm(profile);
    setImageFile(null);
    setImagePreview(null);
    setPendingCropFile(null);
    setEditMode(false);
  };

  const handleSaveProfile = async () => {
    const token = localStorage.getItem("token");
    if (!user?._id || !token) { toast.error("Session expired. Please log in again."); return; }

    const formData = new FormData();
    formData.append("firstName", editForm.firstName || "");
    formData.append("lastName", editForm.lastName || "");
    formData.append("email", editForm.email);
    formData.append("mobileNo", editForm.mobile);
    formData.append("location", editForm.location || "");
    formData.append("bio", editForm.bio || "");
    if (imageFile) formData.append("profileImage", imageFile);
    else if (editForm.image === "") formData.append("profileImage", "");

    try {
      const result = await dispatch(updateUser({ id: user._id, userData: formData, token })).unwrap();
      const u = result.user;
      if (u) {
        const updated = {
          firstName: u.name?.firstName || "",
          lastName: u.name?.lastName || "",
          email: u.email || "",
          mobile: u.mobileNo || "",
          bio: u.bio || "",
          location: u.location || "",
          image: u.image || "",
        };
        setProfile(updated);
        setEditForm(updated);
      }
      toast.success("Profile updated successfully");
      setEditMode(false);
      setImageFile(null);
      setImagePreview(null);
    } catch (err) {
      toast.error(err?.message || "Failed to update profile");
    }
  };

  const displayImage = imagePreview || resolveImageUrl(editForm.image, DEFAULT_AVATAR);

  return (
    <div>
      {/* Avatar row */}
      <div className="mb-6 flex flex-col items-center gap-3 sm:flex-row sm:items-end sm:gap-5">
        <div className="relative">
          <img
            src={displayImage}
            alt="Profile"
            className="h-20 w-20 rounded-full border-2 border-slate-200 object-cover object-top"
            onError={(e) => { e.target.onerror = null; e.target.src = "/profile-photo.png"; }}
          />
          {editMode && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-[#FF6B35] text-white shadow transition hover:bg-[#fd5a1f]"
              title="Change photo"
            >
              <FiCamera className="h-3.5 w-3.5" />
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
        </div>

        {user?.employeeId && (
          <div className="flex flex-col items-center gap-1 sm:items-start">
            <span className="rounded-full bg-slate-100 px-3 py-1 font-mono text-sm font-semibold text-slate-700">
              {user.employeeId}
            </span>
            <span className="text-xs text-slate-400">Employee ID</span>
          </div>
        )}

        {editMode && (
          <div className="flex flex-col items-start gap-1.5">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-2xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Upload Photo
              </button>
              {(imagePreview || profile.image) && (
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null); setEditForm((p) => ({ ...p, image: "" })); }}
                  className="rounded-2xl border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                >
                  Remove
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400">JPG, PNG, GIF — max 5 MB</p>
          </div>
        )}
      </div>

      {/* Fields */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <FiUser className="text-slate-400" /> First Name
          </span>
          <input
            type="text"
            name="firstName"
            value={editMode ? editForm.firstName : profile.firstName}
            disabled={!editMode}
            onChange={handleInputChange}
            className={FIELD_INPUT}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <FiUser className="text-slate-400" /> Last Name
          </span>
          <input
            type="text"
            name="lastName"
            value={editMode ? editForm.lastName : profile.lastName}
            disabled={!editMode}
            onChange={handleInputChange}
            className={FIELD_INPUT}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <FiPhone className="text-slate-400" /> Mobile
          </span>
          <input
            type="text"
            name="mobile"
            value={editMode ? editForm.mobile : profile.mobile}
            disabled={!editMode}
            onChange={handleInputChange}
            className={FIELD_INPUT}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <FiMail className="text-slate-400" /> Email
          </span>
          <input
            type="email"
            name="email"
            value={editMode ? editForm.email : profile.email}
            disabled={!editMode}
            onChange={handleInputChange}
            className={FIELD_INPUT}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <FiMapPin className="text-slate-400" /> Location
          </span>
          <input
            type="text"
            name="location"
            value={editMode ? editForm.location : profile.location}
            disabled={!editMode}
            onChange={handleInputChange}
            className={FIELD_INPUT}
          />
        </label>

        <label className="block md:col-span-2">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Bio</span>
          <textarea
            name="bio"
            value={editMode ? editForm.bio : profile.bio}
            disabled={!editMode}
            onChange={handleInputChange}
            rows={3}
            placeholder="Tell us a bit about yourself"
            className={FIELD_INPUT + " resize-none"}
          />
        </label>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        {editMode ? (
          <>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={loading}
              className="rounded-2xl bg-[#FF6B35] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#fd5a1f] disabled:opacity-50"
            >
              {loading ? "Saving…" : "Save Changes"}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setEditMode(true)}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <FiEdit2 /> Edit Details
          </button>
        )}
      </div>

      <ProfileImageCropper file={pendingCropFile} onApply={handleCropApply} onCancel={handleCropCancel} />
    </div>
  );
};

export default PersonalInfo;
