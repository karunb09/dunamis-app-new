import React, { useState, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { FaEdit, FaCamera } from "react-icons/fa";
import { updateUser } from "../../redux/User/UserSlice";
import toast from "react-hot-toast";
import { DEFAULT_AVATAR, resolveImageUrl } from "../../utils/resolveImageUrl";
import ProfileImageCropper from "../../components/ProfileImageCropper";

const PersonalInfo = ({ user, loading }) => {
    const dispatch = useDispatch();
    const fileInputRef = useRef(null);

    const [editMode, setEditMode] = useState(false);
    const [profile, setProfile] = useState({
        firstName: "",
        lastName: "",
        email: "",
        mobile: "",
        password: "**********",
        bio: "",
        location: "",
        image: "",
    });
    const [editForm, setEditForm] = useState({});
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [pendingCropFile, setPendingCropFile] = useState(null);

    useEffect(() => {
        if (user) {
            const profileData = {
                firstName: user.name?.firstName || "",
                lastName: user.name?.lastName || "",
                email: user.email || "",
                mobile: user.mobileNo || "",
                password: "**********",
                bio: user.bio || "",
                location: user.location || "",
                image: user.image || "/profile-photo.png",
            };
            setProfile(profileData);
            setEditForm(profileData);
        }
    }, [user]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleImageClick = () => {
        if (editMode) {
            fileInputRef.current?.click();
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error("Image size must be less than 5MB");
                return;
            }
            if (!file.type.startsWith("image/")) {
                toast.error("Please select a valid image file");
                return;
            }
            setPendingCropFile(file);
        }
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

    const handleRemovePhoto = () => {
        setImageFile(null);
        setImagePreview(null);
        setPendingCropFile(null);
        setEditForm((prev) => ({ ...prev, image: "" }));
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
        if (!user || !user._id || !token) {
            toast.error("User session is invalid. Please log in again.");
            return;
        }

        const formData = new FormData();
        formData.append("firstName", editForm.firstName || "");
        formData.append("lastName", editForm.lastName || "");
        formData.append("email", editForm.email);
        formData.append("mobileNo", editForm.mobile);
        formData.append("location", editForm.location || "");
        formData.append("bio", editForm.bio || "");

        if (imageFile) {
            formData.append("profileImage", imageFile);
        } else if (editForm.image === "") {
            // This can be used to signal removal if the API supports it
            formData.append("profileImage", "");
        }

        try {
            const result = await dispatch(
                updateUser({ id: user._id, userData: formData, token })
            ).unwrap();
            const updatedUser = result.user;

            if (updatedUser) {
                const profileData = {
                    firstName: updatedUser.name?.firstName || "",
                    lastName: updatedUser.name?.lastName || "",
                    email: updatedUser.email || "",
                    mobile: updatedUser.mobileNo || "",
                    password: "**********",
                    bio: updatedUser.bio || "",
                    location: updatedUser.location || "",
                    image: updatedUser.image || "",
                };
                setProfile(profileData);
                setEditForm(profileData);
            }

            toast.success("Profile updated successfully!");
            setEditMode(false);
            setImageFile(null);
            setImagePreview(null);
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error(error.message || "Failed to update profile");
        }
    };

    const displayImage = imagePreview || resolveImageUrl(editForm.image, DEFAULT_AVATAR);

    return (
        <div>
            <div className="relative inline-block w-24 h-24 mx-auto md:mx-0">
                <img
                    src={displayImage}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover object-top border-2 border-gray-200"
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/profile-photo.png";
                    }}
                />
                {editMode && (
                    <button
                        onClick={handleImageClick}
                        className="absolute bottom-0 right-0 bg-black text-white p-2 rounded-full hover:bg-gray-800 transition"
                        title="Change photo"
                    >
                        <FaCamera className="w-4 h-4" />
                    </button>
                )}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                />
            </div>

            {editMode && (
                <div className="flex gap-3 mt-3 justify-center md:justify-start">
                    <button
                        onClick={handleImageClick}
                        className="px-4 py-1 border rounded-lg text-sm hover:bg-gray-100 transition"
                    >
                        Upload Photo
                    </button>
                    {(imagePreview || profile.image) &&
                        <button
                            onClick={handleRemovePhoto}
                            className="px-4 py-1 border border-red-500 text-red-500 rounded-lg text-sm hover:bg-red-50 transition"
                        >
                            Remove
                        </button>
                    }
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div>
                    <label className="text-sm text-gray-600">First Name</label>
                    <input
                        type="text"
                        name="firstName"
                        value={editForm.firstName}
                        disabled={!editMode}
                        onChange={handleInputChange}
                        className={`w-full p-2 border rounded-lg ${!editMode ? "bg-gray-100 cursor-not-allowed" : "bg-white"
                            }`}
                    />
                </div>
                <div>
                    <label className="text-sm text-gray-600">Last Name</label>
                    <input
                        type="text"
                        name="lastName"
                        value={editForm.lastName}
                        disabled={!editMode}
                        onChange={handleInputChange}
                        className={`w-full p-2 border rounded-lg ${!editMode ? "bg-gray-100 cursor-not-allowed" : "bg-white"
                            }`}
                    />
                </div>
                <div>
                    <label className="text-sm text-gray-600">Mobile</label>
                    <input
                        type="text"
                        name="mobile"
                        value={editForm.mobile}
                        disabled={!editMode}
                        onChange={handleInputChange}
                        className={`w-full p-2 border rounded-lg ${!editMode ? "bg-gray-100 cursor-not-allowed" : "bg-white"
                            }`}
                    />
                </div>
                <div>
                    <label className="text-sm text-gray-600">Email</label>
                    <input
                        type="email"
                        name="email"
                        value={editForm.email}
                        disabled={!editMode}
                        onChange={handleInputChange}
                        className={`w-full p-2 border rounded-lg ${!editMode ? "bg-gray-100 cursor-not-allowed" : "bg-white"
                            }`}
                    />
                </div>
                <div>
                    <label className="text-sm text-gray-600">Password</label>
                    <input
                        type="password"
                        name="password"
                        value="**********"
                        disabled
                        className="w-full p-2 border rounded-lg bg-gray-100 cursor-not-allowed"
                    />
                </div>
                <div>
                    <label className="text-sm text-gray-600">Location</label>
                    <input
                        type="text"
                        name="location"
                        value={editForm.location}
                        disabled={!editMode}
                        onChange={handleInputChange}
                        className={`w-full p-2 border rounded-lg ${!editMode ? "bg-gray-100 cursor-not-allowed" : "bg-white"
                            }`}
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="text-sm text-gray-600">Bio</label>
                    <textarea
                        name="bio"
                        value={editForm.bio}
                        disabled={!editMode}
                        onChange={handleInputChange}
                        rows="3"
                        className={`w-full p-2 border rounded-lg ${!editMode ? "bg-gray-100 cursor-not-allowed" : "bg-white"
                            }`}
                    />
                </div>
            </div>

            <div className="flex flex-col md:flex-row justify-end gap-3 mt-6">
                <button className="px-4 py-2 border rounded-lg">
                    Change Password
                </button>

                {editMode ? (
                    <>
                        <button
                            onClick={handleCancelEdit}
                            className="px-4 py-2 border rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveProfile}
                            disabled={loading}
                            className="px-4 py-2 bg-black text-white rounded-lg disabled:opacity-50"
                        >
                            {loading ? "Saving..." : "Save Changes"}
                        </button>
                    </>
                ) : (
                    <button
                        onClick={() => setEditMode(true)}
                        className="px-4 py-2 bg-black text-white rounded-lg flex items-center gap-2"
                    >
                        <FaEdit /> Edit Details
                    </button>
                )}
            </div>

            <ProfileImageCropper
                file={pendingCropFile}
                onApply={handleCropApply}
                onCancel={handleCropCancel}
            />
        </div>
    );
};

export default PersonalInfo;
