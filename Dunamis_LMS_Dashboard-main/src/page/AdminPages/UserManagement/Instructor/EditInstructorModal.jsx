import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FaCamera } from 'react-icons/fa';
import { DEFAULT_AVATAR, resolveImageUrl } from '../../../../utils/resolveImageUrl';
import ProfileImageCropper from '../../../../components/ProfileImageCropper';

const EditInstructorModal = ({ open, onClose, data, onSave, saving = false }) => {
    const fileInputRef = useRef(null);
    const [form, setForm] = useState(data || {});
    const [profilePictureFile, setProfilePictureFile] = useState(null);
    const [profilePicturePreview, setProfilePicturePreview] = useState("");
    const [pendingCropFile, setPendingCropFile] = useState(null);

    useEffect(() => {
        if (open) {
            setForm(data || {});
            setProfilePictureFile(null);
            setProfilePicturePreview("");
            setPendingCropFile(null);
        }
    }, [open, data]);

    useEffect(() => {
        return () => {
            if (profilePicturePreview) URL.revokeObjectURL(profilePicturePreview);
        };
    }, [profilePicturePreview]);

    const handleChange = (key, value) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const handleProfilePictureChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error("Please select a valid image file");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image size must be less than 5MB");
            return;
        }

        setPendingCropFile(file);
    };

    const handleCropApply = (croppedFile, previewUrl) => {
        if (profilePicturePreview?.startsWith('blob:')) URL.revokeObjectURL(profilePicturePreview);
        setProfilePictureFile(croppedFile);
        setProfilePicturePreview(previewUrl);
        setPendingCropFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleCropCancel = () => {
        setPendingCropFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = () => {
        if (saving) return;
        onSave({ ...form, profilePictureFile });
    };

    if (!open) return null;

    const currentPicture = profilePicturePreview || resolveImageUrl(form.profilePicture, DEFAULT_AVATAR);
    const coursesText = Array.isArray(form.courses) ? form.courses.join(', ') : '';

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black bg-opacity-30 px-3 py-4 sm:items-center sm:px-4">
            <div className="relative my-auto max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-4 shadow-xl sm:p-6">
                <h2 className="text-xl font-semibold mb-4">Edit Instructor Details</h2>

                <div className="mb-5 flex flex-col items-start gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4 sm:flex-row sm:items-center">
                    <img
                        src={currentPicture}
                        alt="Instructor profile"
                        className="h-20 w-20 rounded-full object-cover object-top border border-gray-200"
                    />
                    <div>
                        <p className="text-sm font-medium text-gray-800">Profile Image</p>
                        <p className="text-xs text-gray-500">JPG, PNG, GIF, or WebP. Max 5MB.</p>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="mt-3 inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                        >
                            <FaCamera className="text-xs" />
                            Change Image
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleProfilePictureChange}
                            className="hidden"
                        />
                    </div>
                </div>

                {/* Mode Dropdown */}
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Mode</label>
                    <select
                        value={form.mode || "online"}
                        onChange={(e) => handleChange('mode', e.target.value)}
                        className="w-full border rounded-2xl border-gray-300 rounded px-3 py-2"
                    >
                        <option value="online">Online</option>
                        <option value="offline">Offline</option>
                        <option value="hybrid">Hybrid (Online + Offline)</option>
                    </select>
                </div>

                {/* Branch - only if Offline or Hybrid */}
                {(form.mode === 'offline' || form.mode === 'hybrid') && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">Branch</label>
                        <input
                            type="text"
                            value={form.branch}
                            onChange={(e) => handleChange('branch', e.target.value)}
                            className="rounded-2xl w-full border border-gray-300 rounded px-3 py-2"
                        />
                    </div>
                )}

                {/* Courses Input */}
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Courses (comma-separated)</label>
                    <input
                        type="text"
                        value={coursesText}
                        onChange={(e) =>
                            handleChange('courses', e.target.value.split(',').map(c => c.trim()))
                        }
                        className="rounded-2xl w-full border border-gray-300 rounded px-3 py-2"
                    />
                </div>

                {/* Actions */}
                <div className="sticky bottom-0 -mx-4 mt-6 flex flex-col-reverse gap-3 bg-white/95 px-4 py-3 sm:static sm:mx-0 sm:flex-row sm:justify-end sm:bg-transparent sm:p-0">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="px-4 py-2 rounded-2xl bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="px-4 py-2 rounded-2xl bg-blue-600 text-white rounded hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {saving ? "Saving..." : "Save"}
                    </button>
                </div>
                <ProfileImageCropper
                    file={pendingCropFile}
                    onApply={handleCropApply}
                    onCancel={handleCropCancel}
                />
            </div>
        </div>
    );
};

export default EditInstructorModal;
