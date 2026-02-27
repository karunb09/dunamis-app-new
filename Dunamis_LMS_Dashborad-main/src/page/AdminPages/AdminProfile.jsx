import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaUser, FaEnvelope, FaLock, FaPhone, FaMapMarkerAlt, FaEdit, FaCamera, FaPhoneAlt } from "react-icons/fa";
import { getUserById, updateUser } from "../../redux/User/UserSlice";
import toast from "react-hot-toast";
import ChangePasswordModal from "../../components/ChangePasswordModal";

const IMAGE = import.meta.env.VITE_IMAGE;

const AdminProfile = () => {
    const dispatch = useDispatch();
    const { selectedUser, loading } = useSelector((state) => state.user);
    const fileInputRef = useRef(null);

    const [profile, setProfile] = useState({
        fullName: "",
        email: "",
        phone: "",
        location: "",
        password: "",
        bio: "",
        image: "",
    });

    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [userId, setUserId] = useState(null);
    const [token, setToken] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    // State for Change Password Modal
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    // Fetch user data from API
    useEffect(() => {
        const userData = localStorage.getItem("user");
        const authToken = localStorage.getItem("token");

        if (userData) {
            const parsedData = JSON.parse(userData);
            const id = parsedData._id || parsedData.id;

            setUserId(id);
            setToken(authToken);

            // Fetch fresh user data from API
            dispatch(getUserById({ id, token: authToken }));
        }
    }, [dispatch]);

    // Update profile state when selectedUser changes
    useEffect(() => {
        if (selectedUser) {
            const profileData = {
                fullName: `${selectedUser.name?.firstName || ""} ${selectedUser.name?.lastName || ""}`.trim(),
                email: selectedUser.email || "N/A",
                phone: selectedUser.mobileNo || "N/A",
                location: selectedUser.location || "N/A",
                password: "**********",
                bio: selectedUser.bio || "N/A",
                image: selectedUser.image || "https://i.pravatar.cc/150?img=32",
            };

            setProfile(profileData);
            setEditForm(profileData);
        }
    }, [selectedUser]);

    const handleImageClick = () => {
        if (isEditing) {
            fileInputRef.current?.click();
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];

        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error("Image size should be less than 5MB");
                return;
            }

            if (!file.type.startsWith('image/')) {
                toast.error("Please select a valid image file");
                return;
            }

            setImageFile(file);

            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemovePhoto = () => {
        setImageFile(null);
        setImagePreview(null);
    };

    const handleEditClick = () => {
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setEditForm(profile);
        setImageFile(null);
        setImagePreview(null);
        setIsEditing(false);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSaveChanges = async () => {
        if (!userId || !token) {
            toast.error("User ID or token not found. Please login again.");
            return;
        }

        const [firstName, ...lastNameParts] = editForm.fullName.trim().split(" ");
        const lastName = lastNameParts.join(" ");

        const formData = new FormData();
        formData.append('firstName', firstName || "");
        formData.append('lastName', lastName || "");
        formData.append('email', editForm.email);
        formData.append('mobileNo', editForm.phone);
        formData.append('location', editForm.location || "");
        formData.append('bio', editForm.bio || "");

        if (imageFile) {
            formData.append('profileImage', imageFile);
        }

        try {
            const result = await dispatch(
                updateUser({ id: userId, userData: formData, token })
            ).unwrap();

            toast.success("Profile updated successfully!");

            // Update profile state with the new data from backend
            const updatedProfile = {
                fullName: `${result.user.name.firstName} ${result.user.name.lastName}`,
                email: result.user.email,
                phone: result.user.mobileNo,
                location: result.user.location || "N/A",
                bio: result.user.bio || "N/A",
                password: "**********",
                image: result.user.image,
            };

            setProfile(updatedProfile);
            setEditForm(updatedProfile);

            // Update localStorage with new user data
            const storedUser = JSON.parse(localStorage.getItem("user"));
            const updatedUser = {
                ...storedUser,
                name: result.user.name,
                email: result.user.email,
                mobileNo: result.user.mobileNo,
                location: result.user.location,
                bio: result.user.bio,
                image: result.user.image,
            };
            localStorage.setItem("user", JSON.stringify(updatedUser));

            // Clear the file states
            setImageFile(null);
            setImagePreview(null);
            setIsEditing(false);

            // Refresh user data from API
            dispatch(getUserById({ id: userId, token }));
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error(error.message || "Failed to update profile");
        }
    };

    // Handler to open password modal
    const handleChangePasswordClick = () => {
        setIsPasswordModalOpen(true);
    };

    const displayImage = imagePreview ||
        (profile.image?.startsWith('http')
            ? profile.image
            : `${IMAGE}${profile.image}`);

    // Loading state
    if (loading && !selectedUser) {
        return (
            <div className="p-6 bg-white min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-white min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Profile</h2>
                {!isEditing && (
                    <button
                        onClick={handleEditClick}
                        className="px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition flex items-center gap-2"
                    >
                        <FaEdit /> Edit Profile
                    </button>
                )}
            </div>

            <div className="flex flex-col items-center mb-6">
                <div className="relative">
                    {displayImage ? (
                        <img
                            src={displayImage}
                            alt="Profile"
                            className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                            onError={(e) => {
                                e.target.src = "https://i.pravatar.cc/150?img=32";
                            }}
                        />
                    ) : (
                        <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-2xl border-2 border-gray-300">
                            <FaUser className="text-gray-500" />
                        </div>
                    )}

                    {isEditing && (
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

                {isEditing && (
                    <div className="flex gap-3 mt-3">
                        <button
                            onClick={handleImageClick}
                            className="px-4 py-1 border rounded-lg text-sm hover:bg-gray-100 transition"
                        >
                            Upload Photo
                        </button>
                        {(imagePreview || profile.image) && (
                            <button
                                onClick={handleRemovePhoto}
                                className="px-4 py-1 border border-red-500 text-red-500 rounded-lg text-sm hover:bg-red-50 transition"
                            >
                                Remove
                            </button>
                        )}
                    </div>
                )}

                {isEditing && (
                    <p className="text-xs text-gray-500 mt-2">
                        Accepted formats: JPG, PNG, GIF (Max 5MB)
                    </p>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-xl p-4 flex items-center gap-3 bg-gray-50">
                    <FaUser className="text-gray-500" />
                    <div className="flex-1">
                        <p className="text-xs text-gray-400 mb-1">Full Name</p>
                        {isEditing ? (
                            <input
                                type="text"
                                name="fullName"
                                value={editForm.fullName}
                                onChange={handleInputChange}
                                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter full name"
                            />
                        ) : (
                            <p>{profile.fullName}</p>
                        )}
                    </div>
                </div>

                <div className="border rounded-xl p-4 flex items-center gap-3 bg-gray-50">
                    <FaEnvelope className="text-gray-500" />
                    <div className="flex-1">
                        <p className="text-xs text-gray-400 mb-1">Email</p>
                        {isEditing ? (
                            <input
                                type="email"
                                name="email"
                                value={editForm.email}
                                onChange={handleInputChange}
                                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter email"
                            />
                        ) : (
                            <p>{profile.email}</p>
                        )}
                    </div>
                </div>

                <div className="border rounded-xl p-4 flex items-center gap-3 bg-gray-50">
                    <FaPhoneAlt className="text-gray-500" />
                    <div className="flex-1">
                        <p className="text-xs text-gray-400 mb-1">Mobile Number</p>
                        {isEditing ? (
                            <input
                                type="tel"
                                name="phone"
                                value={editForm.phone}
                                onChange={handleInputChange}
                                maxLength={10}
                                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter phone number"
                            />
                        ) : (
                            <p>{profile.phone}</p>
                        )}
                    </div>
                </div>

                <div className="border rounded-xl p-4 flex items-center gap-3 bg-gray-50">
                    <FaLock className="text-gray-500" />
                    <div className="flex-1">
                        <p className="text-xs text-gray-400 mb-1">Password</p>
                        <p>{profile.password}</p>
                        {!isEditing && (
                            <button
                                onClick={handleChangePasswordClick}
                                className="text-xs text-blue-600 hover:underline mt-1"
                            >
                                Change Password
                            </button>
                        )}
                    </div>
                </div>

                <div className="border rounded-xl p-4 flex items-center gap-3 bg-gray-50">
                    <FaMapMarkerAlt className="text-gray-500" />
                    <div className="flex-1">
                        <p className="text-xs text-gray-400 mb-1">Location</p>
                        {isEditing ? (
                            <input
                                type="text"
                                name="location"
                                value={editForm.location}
                                onChange={handleInputChange}
                                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter location"
                            />
                        ) : (
                            <p>{profile.location}</p>
                        )}
                    </div>
                </div>

                <div className="border rounded-xl p-4 bg-gray-50">
                    <p className="text-xs text-gray-400 mb-2">Bio</p>
                    {isEditing ? (
                        <textarea
                            name="bio"
                            value={editForm.bio}
                            onChange={handleInputChange}
                            rows={3}
                            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter bio"
                        />
                    ) : (
                        <p className="text-sm">{profile.bio}</p>
                    )}
                </div>
            </div>

            {isEditing ? (
                <div className="flex justify-end gap-3 mt-6">
                    <button
                        onClick={handleCancelEdit}
                        className="px-6 py-2 border rounded-xl hover:bg-gray-100 transition"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSaveChanges}
                        className="px-6 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={loading}
                    >
                        {loading ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            ) : null}

            {/* Change Password Modal */}
            <ChangePasswordModal
                isOpen={isPasswordModalOpen}
                onClose={() => setIsPasswordModalOpen(false)}
            />
        </div>
    );
};

export default AdminProfile;
