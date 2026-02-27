import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { fetchAllBranches } from "../../../../redux/Branch/branchSlice";
import { IoClose } from "react-icons/io5";

const CredentialModal = ({ instructor, password, onClose }) => {
    const dispatch = useDispatch();
    const { branches = [], loading } = useSelector((state) => state.branch || {});
    const [selectedBranch, setSelectedBranch] = useState(""); // Single branch
    const [error, setError] = useState("");

    useEffect(() => {
        dispatch(fetchAllBranches());
    }, [dispatch]);

    const handleBranchChange = (e) => {
        setSelectedBranch(e.target.value);
        if (e.target.value) setError("");
    };

    const handleCopy = () => {
        const fullCopyText = `Username: ${instructor.email}\nPassword: ${password}\nBranch: ${selectedBranch}`;
        navigator.clipboard.writeText(fullCopyText)
            .then(() => toast.success("Credentials copied to clipboard!"))
            .catch(() => toast.error("Failed to copy to clipboard."));
    };

    const handleAddInstructor = () => {
        if (!selectedBranch) {
            setError("Please select a branch.");
            return;
        }
        toast.success(`Instructor added to: ${selectedBranch}`);
        onClose();
    };

    const fullName =
        typeof instructor.name === "object"
            ? `${instructor.name.firstName} ${instructor.name.lastName}`
            : instructor.name;

    return (
        <div
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
            onClick={onClose}
        >
            <div
                className="relative bg-white rounded-lg shadow-lg p-6 w-[400px]"
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
                        src={instructor.avatar || "https://via.placeholder.com/40"}
                        alt={fullName}
                        className="w-10 h-10 rounded-full object-cover"
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

                {/* Branch Radio Options */}
                <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Branch <span className="text-red-500">*</span>
                    </label>

                    {loading ? (
                        <p>Loading branches...</p>
                    ) : branches.length === 0 ? (
                        <p className="text-red-500">No branches available</p>
                    ) : (
                        <div className="space-y-2 max-h-40 overflow-auto scrollbar-hide">
                            {branches.map((branch) => (
                                <label key={branch._id || branch.id} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="branch"
                                        value={branch.branchName}
                                        checked={selectedBranch === branch.branchName}
                                        onChange={handleBranchChange}
                                    />
                                    <span>{branch.branchName}</span>
                                </label>
                            ))}
                        </div>
                    )}
                    {error && <p className="text-red-500 mt-1 text-sm">{error}</p>}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center">
                    <button
                        onClick={handleCopy}
                        disabled={!selectedBranch}
                        className={`px-4 py-2 border rounded ${!selectedBranch
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-gray-100"
                            }`}
                    >
                        Copy
                    </button>
                    <button
                        onClick={handleAddInstructor}
                        disabled={!selectedBranch}
                        className={`px-4 py-2 rounded text-white ${!selectedBranch
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-black hover:bg-gray-800"
                            }`}
                    >
                        Add Instructor
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CredentialModal;
