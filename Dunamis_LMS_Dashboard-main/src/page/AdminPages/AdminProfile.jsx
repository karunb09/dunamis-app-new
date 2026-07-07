import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FiCamera, FiEdit2, FiLock, FiMail, FiMapPin, FiPhone, FiUser } from "react-icons/fi";
import { getUserById, updateUser } from "../../redux/User/UserSlice";
import toast from "react-hot-toast";
import ChangePasswordModal from "../../components/ChangePasswordModal";
import { resolveImageUrl } from "../../utils/resolveImageUrl";
import ProfileImageCropper from "../../components/ProfileImageCropper";

const FIELD_INPUT = "w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

const AdminProfile = () => {
  const dispatch = useDispatch();
  const { selectedUser, loading } = useSelector((state) => state.user);
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState({ fullName: "", email: "", phone: "", location: "", bio: "", image: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [userId, setUserId] = useState(null);
  const [token, setToken] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [pendingCropFile, setPendingCropFile] = useState(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    const authToken = localStorage.getItem("token");
    if (userData) {
      const parsed = JSON.parse(userData);
      const id = parsed._id || parsed.id;
      setUserId(id);
      setToken(authToken);
      dispatch(getUserById({ id, token: authToken }));
    }
  }, [dispatch]);

  useEffect(() => {
    if (selectedUser) {
      const data = {
        fullName: `${selectedUser.name?.firstName || ""} ${selectedUser.name?.lastName || ""}`.trim(),
        email: selectedUser.email || "",
        phone: selectedUser.mobileNo || "",
        location: selectedUser.location || "",
        bio: selectedUser.bio || "",
        image: selectedUser.image || "",
      };
      setProfile(data);
      setEditForm(data);
    }
  }, [selectedUser]);

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
    setIsEditing(false);
  };

  const handleSaveChanges = async () => {
    if (!userId || !token) { toast.error("Session expired. Please log in again."); return; }
    const [firstName, ...rest] = editForm.fullName.trim().split(" ");
    const formData = new FormData();
    formData.append("firstName", firstName || "");
    formData.append("lastName", rest.join(" ") || "");
    formData.append("email", editForm.email);
    formData.append("mobileNo", editForm.phone);
    formData.append("location", editForm.location || "");
    formData.append("bio", editForm.bio || "");
    if (imageFile) formData.append("profileImage", imageFile);

    try {
      const result = await dispatch(updateUser({ id: userId, userData: formData, token })).unwrap();
      const updated = {
        fullName: `${result.user.name.firstName} ${result.user.name.lastName}`,
        email: result.user.email,
        phone: result.user.mobileNo,
        location: result.user.location || "",
        bio: result.user.bio || "",
        image: result.user.image,
      };
      setProfile(updated);
      setEditForm(updated);
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ ...stored, ...result.user }));
      setImageFile(null);
      setImagePreview(null);
      setIsEditing(false);
      toast.success("Profile updated successfully");
      dispatch(getUserById({ id: userId, token }));
    } catch (err) {
      toast.error(err?.message || "Failed to update profile");
    }
  };

  const displayImage = imagePreview || resolveImageUrl(profile.image, "/profile-photo.png");

  if (loading && !selectedUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-6">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-slate-900" />
          <p className="mt-4 text-sm text-slate-500">Loading profile…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">Account</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">My Profile</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your personal details and account settings.</p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <FiEdit2 /> Edit Profile
          </button>
        )}
      </div>

      {/* Avatar */}
      <div className="mb-8 flex flex-col items-center gap-3 sm:flex-row sm:items-end sm:gap-5">
        <div className="relative">
          <img
            src={displayImage}
            alt="Profile"
            className="h-24 w-24 rounded-full border-2 border-slate-200 object-cover object-top"
            onError={(e) => { e.target.src = "/profile-photo.png"; }}
          />
          {isEditing && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-[#FF6B35] text-white shadow transition hover:bg-[#fd5a1f]"
              title="Change photo"
            >
              <FiCamera className="h-4 w-4" />
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
        </div>

        {isEditing && (
          <div className="flex flex-col gap-1">
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-2xl border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Upload Photo
              </button>
              {(imagePreview || profile.image) && (
                <button
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="rounded-2xl border border-rose-200 px-4 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
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
            <FiUser className="text-slate-400" /> Full Name
          </span>
          <input
            type="text"
            name="fullName"
            value={isEditing ? editForm.fullName : profile.fullName}
            disabled={!isEditing}
            onChange={(e) => setEditForm((p) => ({ ...p, fullName: e.target.value }))}
            placeholder="Enter full name"
            className={FIELD_INPUT}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <FiMail className="text-slate-400" /> Email Address
          </span>
          <input
            type="email"
            name="email"
            value={isEditing ? editForm.email : profile.email}
            disabled={!isEditing}
            onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
            placeholder="Enter email"
            className={FIELD_INPUT}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <FiPhone className="text-slate-400" /> Mobile Number
          </span>
          <input
            type="tel"
            name="phone"
            value={isEditing ? editForm.phone : profile.phone}
            disabled={!isEditing}
            maxLength={10}
            onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
            placeholder="Enter phone number"
            className={FIELD_INPUT}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <FiLock className="text-slate-400" /> Password
          </span>
          <div className="flex items-center gap-2">
            <input
              type="password"
              value="**********"
              disabled
              className={FIELD_INPUT + " flex-1"}
            />
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(true)}
              className="shrink-0 rounded-2xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Change
            </button>
          </div>
        </label>

        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <FiMapPin className="text-slate-400" /> Location
          </span>
          <input
            type="text"
            name="location"
            value={isEditing ? editForm.location : profile.location}
            disabled={!isEditing}
            onChange={(e) => setEditForm((p) => ({ ...p, location: e.target.value }))}
            placeholder="Enter location"
            className={FIELD_INPUT}
          />
        </label>

        <label className="block md:col-span-2">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Bio</span>
          <textarea
            name="bio"
            value={isEditing ? editForm.bio : profile.bio}
            disabled={!isEditing}
            onChange={(e) => setEditForm((p) => ({ ...p, bio: e.target.value }))}
            rows={3}
            placeholder="Tell us a bit about yourself"
            className={FIELD_INPUT + " resize-none"}
          />
        </label>
      </div>

      {isEditing && (
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={handleCancelEdit}
            disabled={loading}
            className="rounded-2xl border border-slate-200 px-6 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveChanges}
            disabled={loading}
            className="rounded-2xl bg-[#FF6B35] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#fd5a1f] disabled:opacity-50"
          >
            {loading ? "Saving…" : "Save Changes"}
          </button>
        </div>
      )}

      <ChangePasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} />
      <ProfileImageCropper file={pendingCropFile} onApply={handleCropApply} onCancel={handleCropCancel} />
    </div>
  );
};

export default AdminProfile;
