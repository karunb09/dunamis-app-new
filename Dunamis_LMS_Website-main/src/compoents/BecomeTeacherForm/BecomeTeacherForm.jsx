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

export default function MultiStepForm() {
    const [step, setStep] = useState(1);

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
        areaOfExpertise: "",
        yearOfExperience: "",
        highestQualification: "",
        certificationDetails: "",
        currentCTC: "",
        expectedCTC: "",
        noticePeriod: "",
        mode: "",
        availability: [],
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
    const { loading: isSubmitting, success: submitSuccess, error: submitError } =
        useSelector((state) => state.application);

    // toast alerts
    useEffect(() => {
        if (submitSuccess) toast.success("Application submitted successfully!");
        if (submitError) toast.error("Something went wrong");
    }, [submitSuccess, submitError]);

    const handleSubmit = () => {
        const form = new FormData();
        Object.keys(formData).forEach((field) => form.append(field, formData[field]));
        if (cv) form.append("cv", cv);
        if (profileVideo) form.append("profileVideo", profileVideo);
        if (relevantCertificate) form.append("relevantCertificate", relevantCertificate);
        if (profilePicture) form.append("profilePicture", profilePicture);
        dispatch(submitApplication(form));
    };


    const steps = [
        <Step1Personal formData={formData} setFormData={setFormData} />,
        <Step2Contact formData={formData} setFormData={setFormData} />,
        <Step3Professional
            formData={formData}
            setFormData={setFormData}
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
        <Step4Preferences formData={formData} setFormData={setFormData} />,
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
            <div className="w-full max-w-3xl md:max-w-4xl rounded-2xl p-6 md:p-8 shadow-md overflow-hidden">
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
                <h2 className="text-xl md:text-2xl font-semibold text-center text-[#6a844d] mb-1">
                    {step === 1
                        ? "Personal Information"
                        : step === 2
                            ? "Contact Details"
                            : step === 3
                                ? "Professional Details"
                                : "Teaching Preferences & Availability"}
                </h2>

                <p className="text-center text-gray-500 mb-6">Step {step} of 4</p>

                {/* Render step */}
                {steps[step - 1]}

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
                            onClick={() => setStep(step + 1)}
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
