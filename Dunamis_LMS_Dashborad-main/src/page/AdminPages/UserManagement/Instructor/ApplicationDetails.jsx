import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
    fetchApplicationById,
    updateApplicationStatus,
} from "../../../../redux/Intructor/teacherApplication";
import { toast } from "react-hot-toast";
import { X } from "react-feather";
import { FileDoc, FilePdf, FileVideo } from "phosphor-react";
const IMAGE = import.meta.env.VITE_IMAGE;
const ApplicationDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const { data: application, loading, error, status } = useSelector(
        (state) => state.application
    );

    const [showImageModal, setShowImageModal] = useState(false);
    const [showVideoModal, setShowVideoModal] = useState(false);
    const [showPdfModal, setShowPdfModal] = useState(false);

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
                setShowImageModal(false);
                setShowVideoModal(false);
                setShowPdfModal(false);
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
    } = application;

    return (
        <div className="max-w-7xl mx-auto p-4">
            <h2 className="text-2xl font-semibold mb-6">Application Details</h2>

            {/* Status Dropdown */}
            <div className="mb-6">
                <label className="block font-medium mb-1">Application Status</label>
                <select
                    value={status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="border px-3 py-2 rounded w-full sm:w-64"
                >
                    {["new", "shortlisted", "interviewed", "selected", "rejected"].map(
                        (option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        )
                    )}
                </select>
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
                            <label className="text-sm text-gray-600">Email Address</label>
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
                        {/* Certificate */}
                        <div>
                            <label className="text-sm text-gray-600 block mb-1">Relevant Certificate</label>
                            {relevantCertificate ? (
                                <p
                                    onClick={() => setShowImageModal(true)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            setShowImageModal(true);
                                        }
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    aria-label="View Certificate"
                                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-900 cursor-pointer select-none outline-none focus:ring-2 focus:ring-blue-400 rounded"
                                >
                                    <FileDoc className="text-black text-2xl" />
                                    <span>View Certificate</span>
                                </p>
                            ) : (
                                <p>—</p>
                            )}
                        </div>

                        {/* CV */}
                        <div>
                            <label className="text-sm text-gray-600 block mb-1">CV</label>
                            {cv ? (
                                <p
                                    onClick={() => setShowPdfModal(true)}
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            setShowPdfModal(true);
                                        }
                                    }}
                                    role="button"
                                    aria-label="View CV"
                                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-900 cursor-pointer select-none outline-none focus:ring-2 focus:ring-blue-400 rounded"
                                >
                                    <FilePdf className="text-black text-2xl" />
                                    <span>View CV</span>
                                </p>
                            ) : (
                                <p>—</p>
                            )}
                        </div>

                        {/* Profile Video */}
                        <div>
                            <label className="text-sm text-gray-600 block mb-1">Profile Video</label>
                            {profileVideo ? (
                                <p
                                    onClick={() => setShowVideoModal(true)}
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            setShowVideoModal(true);
                                        }
                                    }}
                                    role="button"
                                    aria-label="View Profile Video"
                                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-900 cursor-pointer select-none outline-none focus:ring-2 focus:ring-blue-400 rounded"
                                >
                                    <FileVideo className="text-black text-2xl" />
                                    <span>View Video</span>
                                </p>
                            ) : (
                                <p>—</p>
                            )}
                        </div>
                    </div>
                </section>
            </div>

            {/* Modals */}
            {showImageModal && (
                <ImageModal
                    src={`${IMAGE}${relevantCertificate}`}
                    onClose={() => setShowImageModal(false)}
                    title="Relevant Certificate"
                />
            )}
            {showPdfModal && (
                <PdfModal
                    src={`${IMAGE}${cv}`}
                    onClose={() => setShowPdfModal(false)}
                    title="Curriculum Vitae"
                />
            )}
            {showVideoModal && (
                <VideoModal
                    src={`${IMAGE}${profileVideo}`}
                    onClose={() => setShowVideoModal(false)}
                    title="Profile Video"
                />
            )}
        </div>
    );
};

// Modal base styling wrapper
const ModalWrapper = ({ onClose, children, title }) => {
    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
            aria-labelledby="modal-title"
        >
            <div
                className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto p-6 relative shadow-lg"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-gray-600 hover:text-gray-900 text-3xl font-bold"
                    aria-label="Close modal"
                >
                    <X />
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

export default ApplicationDetails;
