"use client";

import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import { submitApplication, resetStatus } from "@/store/applicationSlice";


//  steps forms
import Step1Personal from "./Step1Personal";
import Step2Contact from "./Step2Contact";
import Step3Professional from "./Step3Professional";
import Step4Preferences from "./Step4Preferences";
import { formatFileSize } from "./FormFields";

const getTodayDateString = () => {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    return today.toISOString().slice(0, 10);
};

export default function MultiStepForm() {
    const [step, setStep] = useState(1);
    const [fieldErrors, setFieldErrors] = useState({});
    const [emailVerified, setEmailVerified] = useState(false);

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        gender: "",
        dob: "",
        readLanguage: "",
        speakLanguage: "",
        email: "",
        mobileNo: "",
        currentState: "",
        currentCity: "",
        currentAddress: "",
        country: "IN",
        areaOfExpertise: "",
        specialization: "",
        yearOfExperience: "",
        highestQualification: "",
        certificationDetails: "",
        currentCTC: "",
        expectedCTC: "",
        noticePeriod: "",
        mode: "",
        availability: "",
    });

    // Files
    const [cv, setCv] = useState(null);
    const [profileVideo, setProfileVideo] = useState(null);
    const [relevantCertificate, setRelevantCertificate] = useState(null);
    const [profilePicture, setProfilePicture] = useState(null);
    const profilePictureInputRef = useRef(null);
    const cvInputRef = useRef(null);
    const videoInputRef = useRef(null);
    const certificateInputRef = useRef(null);

    const dispatch = useDispatch();
    const {
        loading: isSubmitting,
        success: submitSuccess,
        error: submitError,
        errorDetails,
        uploadProgress,
        fileProgress,
    } =
        useSelector((state) => state.application);

    const uploadItems = [
        { key: "profilePicture", label: "Profile Picture", file: profilePicture },
        { key: "cv", label: "CV", file: cv },
        { key: "profileVideo", label: "Profile Video", file: profileVideo },
        { key: "relevantCertificate", label: "Relevant Certificate", file: relevantCertificate },
    ].filter((item) => item.file);

    // toast alerts
    useEffect(() => {
        if (submitSuccess) toast.success("Application submitted successfully!");
        if (submitError) toast.error(submitError);
    }, [submitSuccess, submitError]);

    useEffect(() => {
        return () => {
            dispatch(resetStatus());
        };
    }, [dispatch]);

    const validateFileType = (file, allowedMimeTypes) => {
        if (!file) return false;
        return allowedMimeTypes.includes(file.type);
    };

    const validateCurrentStep = (currentStep) => {
        const errors = {};

        if (currentStep === 1) {
            if (!formData.firstName.trim()) errors.firstName = "First name is required";
            if (!formData.lastName.trim()) errors.lastName = "Last name is required";
            if (!formData.gender) errors.gender = "Please select your gender";
            if (!formData.readLanguage.trim()) {
                errors.readLanguage = "Please enter the languages you can read";
            }
            if (!formData.speakLanguage.trim()) {
                errors.speakLanguage = "Please enter the languages you can speak";
            }
        }

        if (currentStep === 2) {
            if (!formData.email.trim()) errors.email = "Email address is required";
            else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
                errors.email = "Enter a valid email address";
            } else if (!emailVerified) {
                errors.email = "Please verify your email address before continuing";
            }
            if (!/^\d{10}$/.test(formData.mobileNo.trim())) {
                errors.mobileNo = "Mobile number must be 10 digits";
            }
            if (!formData.currentState.trim()) errors.currentState = "Please select your state";
            if (!formData.currentCity.trim()) errors.currentCity = "Please select your city";
            if (!formData.currentAddress.trim()) errors.currentAddress = "Current address is required";
        }

        if (currentStep === 3) {
            if (!formData.areaOfExpertise.trim()) {
                errors.areaOfExpertise = "Please select your area of expertise";
            }
            if (!formData.highestQualification.trim()) {
                errors.highestQualification = "Please select your highest qualification";
            }
            if (!formData.yearOfExperience.trim()) {
                errors.yearOfExperience = "Years of experience is required";
            }
            if (!profilePicture) {
                errors.profilePicture = "Profile picture is required";
            } else if (
                !validateFileType(profilePicture, ["image/png", "image/jpeg", "image/jpg"])
            ) {
                errors.profilePicture = "Profile picture must be JPG or PNG";
            }
            if (!cv) {
                errors.cv = "CV is required";
            } else if (!validateFileType(cv, ["application/pdf"])) {
                errors.cv = "CV must be a PDF file";
            }
            if (!profileVideo) {
                errors.profileVideo = "Profile video is required";
            } else if (
                !validateFileType(profileVideo, [
                    "video/mp4",
                    "video/mpeg",
                    "video/avi",
                    "video/quicktime",
                ])
            ) {
                errors.profileVideo = "Profile video must be MP4, MPEG, AVI, or MOV";
            }
            if (
                relevantCertificate &&
                !validateFileType(relevantCertificate, [
                    "application/pdf",
                    "image/png",
                    "image/jpeg",
                    "image/jpg",
                ])
            ) {
                errors.relevantCertificate =
                    "Certificate must be a PDF, JPG, or PNG file";
            }
        }

        if (currentStep === 4) {
            if (!formData.currentCTC.trim()) errors.currentCTC = "Current CTC is required";
            if (!formData.expectedCTC.trim()) errors.expectedCTC = "Expected CTC is required";
            if (!formData.noticePeriod) {
                errors.noticePeriod = "Please select when you can join";
            } else if (formData.noticePeriod < getTodayDateString()) {
                errors.noticePeriod = "Join date cannot be in the past";
            }
            if (!formData.mode) errors.mode = "Please select your teaching mode";
            if (!formData.availability) errors.availability = "Please select your availability";
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = () => {
        if (!validateCurrentStep(4)) {
            return;
        }

        const form = new FormData();
        Object.keys(formData).forEach((field) => form.append(field, formData[field]));
        if (cv) form.append("cv", cv);
        if (profileVideo) form.append("profileVideo", profileVideo);
        if (relevantCertificate) form.append("relevantCertificate", relevantCertificate);
        if (profilePicture) form.append("profilePicture", profilePicture);
        dispatch(submitApplication(form));
    };


    const steps = [
        <Step1Personal formData={formData} setFormData={setFormData} errors={fieldErrors} />,
        <Step2Contact
            formData={formData}
            setFormData={setFormData}
            errors={fieldErrors}
            emailVerified={emailVerified}
            onEmailVerified={() => setEmailVerified(true)}
            onEmailChange={() => setEmailVerified(false)}
        />,
        <Step3Professional
            formData={formData}
            setFormData={setFormData}
            errors={fieldErrors}
            cv={cv}
            setCv={setCv}
            cvInputRef={cvInputRef}
            profileVideo={profileVideo}
            setProfileVideo={setProfileVideo}
            videoInputRef={videoInputRef}
            relevantCertificate={relevantCertificate}
            setRelevantCertificate={setRelevantCertificate}
            certificateInputRef={certificateInputRef}
            profilePicture={profilePicture}
            setProfilePicture={setProfilePicture}
            profilePictureInputRef={profilePictureInputRef}
        />,
        <Step4Preferences formData={formData} setFormData={setFormData} errors={fieldErrors} />,
    ];
    if (submitSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 md:p-6 lg:p-8">
                <div className="w-full max-w-3xl md:max-w-4xl rounded-2xl p-6 md:p-8 shadow-md overflow-hidden text-center">
                    <h2 className="text-3xl font-bold mb-4 text-green-600">Application Submitted!</h2>
                    <p className="text-gray-700">
                        Thank you for applying. We will get back to you soon.
                    </p>
                </div>
            </div>
        );
    }
    return (
        <div className="min-h-screen flex items-center justify-center p-4 md:p-6 lg:p-8">
            <div className="w-full max-w-3xl md:max-w-4xl rounded-3xl border border-gray-100 bg-white p-6 md:p-8 shadow-xl overflow-hidden">
                {/* Render step Progress bar */}
                <div className="flex flex-wrap justify-center mb-6 gap-2 md:gap-4">
                    {[1, 2, 3, 4].map((s) => (
                        <div key={s} className="flex items-center">
                            <div
                                className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-white font-semibold ${step >= s ? "bg-orange-500" : "bg-gray-300"
                                    }`}
                            >
                                {s}
                            </div>
                            {s < 4 && (
                                <div
                                    className={`w-6 md:w-12 h-[2px] ${step > s ? "bg-orange-500" : "bg-gray-300"
                                        }`}
                                ></div>
                            )}
                        </div>
                    ))}
                </div>
                {/* Step heading */}
                <h2 className="text-xl md:text-2xl font-semibold text-center text-gray-900 mb-1">
                    {step === 1
                        ? "Personal Information"
                        : step === 2
                            ? "Contact Details"
                            : step === 3
                                ? "Professional Details"
                                : "Teaching Preferences & Availability"}
                </h2>

                <p className="text-center text-gray-500 mb-6">Step {step} of 4</p>

                {submitError ? (
                    <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4">
                        <p className="font-medium text-red-700">{submitError}</p>
                        {Array.isArray(errorDetails) && errorDetails.length > 0 ? (
                            <ul className="mt-2 list-disc pl-5 text-sm text-red-600">
                                {errorDetails.map((detail, index) => (
                                    <li key={`${detail}-${index}`}>{detail}</li>
                                ))}
                            </ul>
                        ) : null}
                    </div>
                ) : null}

                {/* Render step */}
                {steps[step - 1]}

                {isSubmitting ? (
                    <div className="mt-6 space-y-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {uploadItems.map(({ key, label, file }) => {
                                const pct = fileProgress[key] ?? 0;
                                const done = pct === 100;
                                return (
                                    <div
                                        key={key}
                                        className="rounded-2xl border border-gray-100 bg-gray-50 p-3"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold text-gray-700">
                                                    {label}
                                                </p>
                                                <p className="truncate text-xs text-gray-500">
                                                    {file.name} · {formatFileSize(file.size)}
                                                </p>
                                            </div>
                                            <span
                                                className={`shrink-0 text-xs font-semibold ${done ? "text-green-600" : "text-orange-600"
                                                    }`}
                                            >
                                                {done ? "Done ✓" : `${pct}%`}
                                            </span>
                                        </div>
                                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                                            <div
                                                className={`h-full transition-all duration-200 ${done ? "bg-green-500" : "bg-orange-500"
                                                    }`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                                <div
                                    className="h-full bg-orange-500 transition-all duration-200"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                            <p className="mt-1 text-center text-sm text-gray-500">
                                {uploadProgress < 100
                                    ? `Uploading… ${uploadProgress}% (large video files may take a few minutes)`
                                    : "Finishing up…"}
                            </p>
                        </div>
                    </div>
                ) : null}

                {/* Navigation buttons */}
                <div className="mt-6 flex justify-between items-center">
                    {step > 1 ? (
                        <button
                            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-6 rounded-2xl"
                            onClick={() => setStep(step - 1)}
                            disabled={isSubmitting}
                        >
                            Previous
                        </button>
                    ) : (
                        <div />
                    )}

                    {step < 4 ? (
                        <button
                            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-6 rounded-2xl"
                            onClick={() => {
                                if (validateCurrentStep(step)) {
                                    setStep(step + 1);
                                }
                            }}
                            disabled={isSubmitting}
                        >
                            Next
                        </button>
                    ) : (
                        <button
                            className={`bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-6 rounded-2xl ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Submitting..." : "Submit"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
