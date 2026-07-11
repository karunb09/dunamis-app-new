import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
    deleteApplication,
    fetchApplicationById,
    updateApplicationStatus,
} from "../../../../redux/Intructor/teacherApplication";
import { toast } from "react-hot-toast";
import { FiX } from "react-icons/fi";
import { PiFileDoc, PiFilePdf, PiFileVideo } from "react-icons/pi";
import { FaTrash } from "react-icons/fa";
import { resolveImageUrl } from "../../../../utils/resolveImageUrl";
import BackButton from "../../../../components/BackButton";

const resolveAssetUrl = (path) => resolveImageUrl(path, "");

const getFileExtension = (path = "") => {
    const cleanPath = String(path || "").split("?")[0].split("#")[0];
    const extension = cleanPath.split(".").pop();
    return extension ? extension.toLowerCase() : "";
};

const isPdfFile = (path = "") => getFileExtension(path) === "pdf";
const isVideoFile = (path = "") =>
    ["mp4", "mpeg", "mpg", "avi", "mov", "webm", "m4v"].includes(
        getFileExtension(path)
    );
const isImageFile = (path = "") =>
    ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "avif"].includes(
        getFileExtension(path)
    );

const ApplicationDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const { data: application, loading, error, status } = useSelector(
        (state) => state.application
    );

    const [previewAsset, setPreviewAsset] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        dispatch(fetchApplicationById(id));
    }, [id, dispatch]);

    useEffect(() => {
        if (error) {
            toast.error(error);
            navigate("/applications");
        }
    }, [error, navigate]);

    const handleStatusChange = async (newStatus) => {
        const result = await dispatch(
            updateApplicationStatus({ id, status: newStatus })
        );
        if (result.meta.requestStatus === "fulfilled") {
            toast.success("Status updated!");
        } else {
            toast.error(result.payload || "Error updating status");
        }
    };

    const handleDeleteApplication = async () => {
        const fullName = `${application?.name?.firstName || ""} ${
            application?.name?.lastName || ""
        }`.trim() || "this applicant";
        const linkedWarning =
            application?.status === "selected"
                ? "\n\nIf this application is already linked to an instructor, delete will be blocked. Delete the instructor from the Instructor tab instead."
                : "";

        const confirmed = window.confirm(
            `Delete application for ${fullName}? This cannot be undone.${linkedWarning}`
        );

        if (!confirmed) return;

        setIsDeleting(true);
        try {
            await dispatch(deleteApplication(id)).unwrap();
            toast.success("Application deleted successfully.");
            navigate("/applications", { replace: true });
        } catch (deleteError) {
            toast.error(deleteError || "Failed to delete application.");
        } finally {
            setIsDeleting(false);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "—";
        const date = new Date(dateStr);
        if (isNaN(date)) return "—";
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    // Keyboard ESC close handler
    const handleEscClose = useCallback(
        (e) => {
            if (e.key === "Escape") {
                setPreviewAsset(null);
            }
        },
        []
    );

    useEffect(() => {
        window.addEventListener("keydown", handleEscClose);
        return () => window.removeEventListener("keydown", handleEscClose);
    }, [handleEscClose]);

    if (loading) return <p className="p-6">Loading...</p>;
    if (!application) return <p className="p-6">No application found.</p>;

    const {
        name,
        email,
        mobileNo,
        gender,
        language,
        currentCity,
        currentState,
        currentAddress,
        areaOfExpertise,
        yearOfExperience,
        highestQualification,
        createdAt,
        relevantCertificate,
        cv,
        profileVideo,
        profilePicture,
    } = application;

    const certificateUrl = resolveAssetUrl(relevantCertificate);
    const cvUrl = resolveAssetUrl(cv);
    const profileVideoUrl = resolveAssetUrl(profileVideo);
    const profilePictureUrl = resolveAssetUrl(profilePicture);

    const openPreview = (type, src, title) => {
        if (!src) return;
        setPreviewAsset({ type, src, title });
    };

    const DocumentLink = ({ icon, label, src, onPreview }) => {
        if (!src) return <p>—</p>;

        return (
            <div className="flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    onClick={onPreview}
                    className="inline-flex items-center gap-2 rounded text-blue-600 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                    {icon}
                    <span>{label}</span>
                </button>
                <a
                    href={src}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-gray-600 underline underline-offset-2 hover:text-gray-900"
                >
                    Open file
                </a>
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto p-4">
            <BackButton className="mb-4" />
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-2xl font-semibold">Application Details</h2>
                <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleDeleteApplication}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <FaTrash className="text-xs" />
                    {isDeleting ? "Deleting..." : "Delete Application"}
                </button>
            </div>

            {/* Status Dropdown */}
            <div className="mb-6">
                <label className="block font-medium mb-1">Application Status</label>
                <select
                    value={status}
                    disabled={status === "selected"}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className={`border px-3 py-2 rounded w-full sm:w-64 ${
                        status === "selected"
                            ? "cursor-not-allowed border-emerald-200 bg-emerald-50 text-emerald-700"
                            : ""
                    }`}
                >
                    {["new", "shortlisted", "interviewed", "selected", "rejected"].map(
                        (option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        )
                    )}
                </select>
                {status === "selected" && (
                    <p className="mt-1.5 text-xs text-emerald-700">
                        Instructor selected and credentials issued — this application has completed its cycle.
                    </p>
                )}
            </div>

            {/* Two-column section layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Info */}
                <section className="bg-white p-4 rounded-md border mb-6">
                    <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-gray-600">First Name</label>
                            <p>{name?.firstName || "—"}</p>
                        </div>
                        <div>
                            <label className="text-sm text-gray-600">Last Name</label>
                            <p>{name?.lastName || "—"}</p>
                        </div>
                        <div>
                            <label className="text-sm text-gray-600">Gender</label>
                            <p>{gender || "—"}</p>
                        </div>
                        <div>
                            <label className="text-sm text-gray-600">Languages</label>
                            <p>
                                {[...(language?.read || []), ...(language?.speak || [])]
                                    .filter((v, i, arr) => arr.indexOf(v) === i)
                                    .join(", ") || "—"}
                            </p>
                        </div>
                    </div>
                </section>

                {/* Contact Info */}
                <section className="bg-white p-4 rounded-md border mb-6">
                    <h3 className="text-lg font-semibold mb-4">Contact Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-gray-600">Email</label>
                            <p>{email || "—"}</p>
                        </div>
                        <div>
                            <label className="text-sm text-gray-600">Mobile Number</label>
                            <p>{mobileNo || "—"}</p>
                        </div>
                        <div>
                            <label className="text-sm text-gray-600">Current City</label>
                            <p>{currentCity || "—"}</p>
                        </div>
                        <div>
                            <label className="text-sm text-gray-600">Current State</label>
                            <p>{currentState || "—"}</p>
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-sm text-gray-600">Current Address</label>
                            <p>{currentAddress || "—"}</p>
                        </div>
                    </div>
                </section>

                {/* Professional Info */}
                <section className="bg-white p-4 rounded-md border mb-6">
                    <h3 className="text-lg font-semibold mb-4">Professional Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-gray-600">Area of Expertise</label>
                            <p>
                                {Array.isArray(areaOfExpertise)
                                    ? areaOfExpertise.join(", ")
                                    : areaOfExpertise || "—"}
                            </p>
                        </div>
                        <div>
                            <label className="text-sm text-gray-600">Years of Experience</label>
                            <p>{yearOfExperience ? `${yearOfExperience} years` : "—"}</p>
                        </div>
                        <div>
                            <label className="text-sm text-gray-600">Qualification</label>
                            <p>{highestQualification || "—"}</p>
                        </div>
                        <div>
                            <label className="text-sm text-gray-600">Applied On</label>
                            <p>{formatDate(createdAt)}</p>
                        </div>
                    </div>
                </section>

                {/* Additional Documents */}
                <section className="bg-white p-4 rounded-md border mb-6">
                    <h3 className="text-lg font-semibold mb-4">Documents</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-gray-600 block mb-1">Profile Picture</label>
                            {profilePictureUrl ? (
                                <div className="flex flex-wrap items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            openPreview("image", profilePictureUrl, "Profile Picture")
                                        }
                                        className="inline-flex items-center gap-2 rounded text-blue-600 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    >
                                        <PiFileDoc className="text-black text-2xl" />
                                        <span>View Profile Picture</span>
                                    </button>
                                    <a
                                        href={profilePictureUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm font-medium text-gray-600 underline underline-offset-2 hover:text-gray-900"
                                    >
                                        Open file
                                    </a>
                                </div>
                            ) : (
                                <p>—</p>
                            )}
                        </div>

                        {/* Certificate */}
                        <div>
                            <label className="text-sm text-gray-600 block mb-1">Relevant Certificate</label>
                            <DocumentLink
                                icon={<PiFileDoc className="text-black text-2xl" />}
                                label="View Certificate"
                                src={certificateUrl}
                                onPreview={() =>
                                    openPreview(
                                        isPdfFile(relevantCertificate) ? "pdf" : "image",
                                        certificateUrl,
                                        "Relevant Certificate"
                                    )
                                }
                            />
                        </div>

                        {/* CV */}
                        <div>
                            <label className="text-sm text-gray-600 block mb-1">CV</label>
                            <DocumentLink
                                icon={<PiFilePdf className="text-black text-2xl" />}
                                label="View CV"
                                src={cvUrl}
                                onPreview={() =>
                                    openPreview(
                                        isPdfFile(cv) ? "pdf" : isImageFile(cv) ? "image" : "file",
                                        cvUrl,
                                        "Curriculum Vitae"
                                    )
                                }
                            />
                        </div>

                        {/* Profile Video */}
                        <div>
                            <label className="text-sm text-gray-600 block mb-1">Profile Video</label>
                            <DocumentLink
                                icon={<PiFileVideo className="text-black text-2xl" />}
                                label="View Video"
                                src={profileVideoUrl}
                                onPreview={() =>
                                    openPreview(
                                        isVideoFile(profileVideo) ? "video" : "file",
                                        profileVideoUrl,
                                        "Profile Video"
                                    )
                                }
                            />
                        </div>
                    </div>
                </section>
            </div>

            {/* Modals */}
            {previewAsset?.type === "image" && (
                <ImageModal
                    src={previewAsset.src}
                    onClose={() => setPreviewAsset(null)}
                    title={previewAsset.title}
                />
            )}
            {previewAsset?.type === "pdf" && (
                <PdfModal
                    src={previewAsset.src}
                    onClose={() => setPreviewAsset(null)}
                    title={previewAsset.title}
                />
            )}
            {previewAsset?.type === "video" && (
                <VideoModal
                    src={previewAsset.src}
                    onClose={() => setPreviewAsset(null)}
                    title={previewAsset.title}
                />
            )}
            {previewAsset?.type === "file" && (
                <FileModal
                    src={previewAsset.src}
                    onClose={() => setPreviewAsset(null)}
                    title={previewAsset.title}
                />
            )}
        </div>
    );
};

// Modal base styling wrapper
const ModalWrapper = ({ onClose, children, title }) => {
    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black bg-opacity-80 px-3 py-4 backdrop-blur-sm sm:items-center sm:px-4"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
            aria-labelledby="modal-title"
        >
            <div
                className="relative my-auto max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-auto rounded-lg bg-white p-4 shadow-lg sm:p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-gray-600 hover:text-gray-900 text-3xl font-bold"
                    aria-label="Close modal"
                >
                    <FiX />
                </button>
                <h3
                    id="modal-title"
                    className="text-xl font-semibold mb-4 border-b pb-2"
                >
                    {title}
                </h3>
                {children}
            </div>
        </div>
    );
};

const ImageModal = ({ src, onClose, title }) => {
    return (
        <ModalWrapper onClose={onClose} title={title}>
            <img
                src={src}
                alt={title}
                className="max-w-full max-h-[70vh] object-contain rounded"
                loading="lazy"
            />
        </ModalWrapper>
    );
};

const PdfModal = ({ src, onClose, title }) => {
    return (
        <ModalWrapper onClose={onClose} title={title}>
            <iframe
                src={src}
                title={title}
                className="w-full h-[70vh] rounded border"
                frameBorder="0"
            >
                Your browser does not support iframes.
            </iframe>
        </ModalWrapper>
    );
};

const VideoModal = ({ src, onClose, title }) => {
    return (
        <ModalWrapper onClose={onClose} title={title}>
            <video
                controls
                src={src}
                className="w-full max-h-[70vh] rounded"
                aria-label={title}
            >
                Your browser does not support the video tag.
            </video>
        </ModalWrapper>
    );
};

const FileModal = ({ src, onClose, title }) => {
    return (
        <ModalWrapper onClose={onClose} title={title}>
            <div className="space-y-4">
                <p className="text-sm text-gray-600">
                    Preview is not available for this file type. Open it in a new tab to view or download it.
                </p>
                <a
                    href={src}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                    Open file
                </a>
            </div>
        </ModalWrapper>
    );
};

export default ApplicationDetails;
