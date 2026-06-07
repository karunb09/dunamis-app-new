import React from "react";
import toast from "react-hot-toast";
import { IoClose } from "react-icons/io5";
import { DEFAULT_AVATAR, resolveImageUrl } from "../../../../utils/resolveImageUrl";

const CredentialModal = ({ instructor, password, onClose }) => {
    const handleCopy = () => {
        const fullCopyText = `Username: ${instructor.email}\nPassword: ${password}`;
        navigator.clipboard.writeText(fullCopyText)
            .then(() => toast.success("Credentials copied to clipboard!"))
            .catch(() => toast.error("Failed to copy to clipboard."));
    };

    const fullName =
        typeof instructor.name === "object"
            ? `${instructor.name.firstName} ${instructor.name.lastName}`
            : instructor.name;

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black bg-opacity-50 px-3 py-4 sm:items-center sm:px-4"
            onClick={onClose}
        >
            <div
                className="relative my-auto max-h-[calc(100vh-2rem)] w-full max-w-[400px] overflow-y-auto rounded-lg bg-white p-4 shadow-lg sm:p-6"
                onClick={(e) => e.stopPropagation()}
            >
                {/* X Icon */}
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
                >
                    <IoClose size={22} />
                </button>

                <h2 className="text-lg font-semibold mb-4">Generate Credentials</h2>

                <div className="flex items-center gap-3 mb-4">
                    <img
                        src={resolveImageUrl(instructor.avatar, DEFAULT_AVATAR)}
                        alt={fullName}
                        className="w-10 h-10 rounded-full object-cover object-top"
                    />
                    <span className="font-medium">{fullName}</span>
                </div>

                <div className="mb-3">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Username
                    </label>
                    <p className="text-gray-600">{instructor.email}</p>
                </div>

                <div className="mb-3">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Password
                    </label>
                    <p className="font-mono bg-gray-100 rounded px-3 py-2 select-all cursor-pointer">
                        {password}
                    </p>
                </div>

                <div className="mb-4">
                    <p className="text-sm text-gray-600">
                        The instructor account is already created when the application is marked
                        as <span className="font-medium">selected</span>. Copy the credentials if
                        you need them for handoff.
                    </p>
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                        onClick={handleCopy}
                        className="px-4 py-2 border rounded hover:bg-gray-100"
                    >
                        Copy
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded text-white bg-black hover:bg-gray-800"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CredentialModal;
