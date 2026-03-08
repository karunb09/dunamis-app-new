import React, { useState, useEffect } from "react";
import { FaTimes, FaImage } from "react-icons/fa";
import { resolveImageUrl } from "../../../utils/resolveImageUrl";

const DEFAULT_COURSE_IMAGE = "https://placehold.co/640x360?text=Course";

const CourseMediaForm = ({ media, setMedia, existingImage }) => {
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    // Load existing
    useEffect(() => {
        if (existingImage && !media) {
            setPreviewUrl(resolveImageUrl(existingImage, DEFAULT_COURSE_IMAGE));
        }
    }, [existingImage, media]);

    useEffect(() => {
        if (media) {
            setFile(media);
        }
    }, [media]);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            const preview = URL.createObjectURL(selectedFile);
            setFile(selectedFile);
            setMedia(selectedFile);
            setPreviewUrl(preview);
        }
    };

    const handleRemoveFile = () => {
        if (previewUrl && previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl);
        }
        setFile(null);
        setMedia(null);
        setPreviewUrl(null);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            const preview = URL.createObjectURL(droppedFile);
            setFile(droppedFile);
            setMedia(droppedFile);
            setPreviewUrl(preview);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (previewUrl && previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-6">
            <label
                htmlFor="file-upload"
                className="border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 p-6 flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:border-gray-400 transition-colors"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
            >
                <FaImage size={36} className="mb-2" />
                <p className="text-sm">
                    Drag and drop an image here, or click to browse
                </p>
                <input
                    id="file-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleFileChange}
                    className="hidden"
                />
            </label>

            {(file || previewUrl) && (
                <div className="flex flex-wrap gap-4">
                    <div className="relative flex items-center border border-gray-200 px-4 py-2 rounded-full bg-white text-sm text-gray-700">
                        <img
                            src={previewUrl}
                            alt={file ? file.name : "Course image"}
                            className="w-10 h-10 object-cover rounded mr-2"
                            onError={(e) => {
                                e.target.src = "https://via.placeholder.com/40?text=Error";
                            }}
                        />
                        <span className="truncate max-w-[120px]">
                            {file ? file.name : "Existing image"}
                        </span>
                        <button
                            type="button"
                            onClick={handleRemoveFile}
                            className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
                            aria-label="Remove file"
                        >
                            <FaTimes size={12} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseMediaForm;
