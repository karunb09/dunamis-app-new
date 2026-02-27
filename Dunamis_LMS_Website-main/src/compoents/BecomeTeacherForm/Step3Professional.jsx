import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiEdit2, FiTrash2, FiUploadCloud } from "react-icons/fi";
import { fetchCategories } from '@/store/categorySlice';

export default function Step3Professional({
    formData,
    setFormData,
    cv,
    setCv,
    cvInputRef,
    profileVideo,
    setProfileVideo,
    videoInputRef,
    relevantCertificate,
    setRelevantCertificate,
    certificateInputRef,
    profilePicture,
    setProfilePicture,
    profilePictureInputRef,
}) {
    const dispatch = useDispatch();
    const { categories, subCategories, status } = useSelector(state => state.category);

    const [expertise, setExpertise] = useState("");
    const [specializations, setSpecializations] = useState([]);
    const [selectedSpecialization, setSelectedSpecialization] = useState("");

    const [hasCertificate, setHasCertificate] = useState("No"); 

    useEffect(() => {
        if (status === 'idle') {
            dispatch(fetchCategories());
        }
    }, [status, dispatch]);

    useEffect(() => {
        if (expertise) {
            const filteredSpecializations = subCategories.filter(
                (subCategory) => subCategory.categoryId === expertise
            );
            setSpecializations(filteredSpecializations);
            setSelectedSpecialization("");
        }
    }, [expertise, subCategories]);

    const handleExpertiseChange = (e) => {
        const selectedCategoryId = e.target.value;
        setExpertise(selectedCategoryId);

        const selectedCategory = categories.find(cat => cat._id === selectedCategoryId);

        setFormData({
            ...formData,
            areaOfExpertise: selectedCategory?.name || "",
            specialization: "",
        });

        setSelectedSpecialization("");
    };

    const handleSpecializationChange = (e) => {
        const selectedId = e.target.value;
        setSelectedSpecialization(selectedId);

        const selectedSubCategory = specializations.find(sub => sub._id === selectedId);

        setFormData({
            ...formData,
            specialization: selectedSubCategory?.name || "",
        });
    };


    const handleCertificateOptionChange = (e) => {
        const value = e.target.value;
        setHasCertificate(value);

        // Clear relevantCertificate if "No" selected
        if (value === "No") {
            setRelevantCertificate(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
                <select
                    className="w-full p-3 rounded-2xl border border-gray-300"
                    value={expertise}
                    onChange={handleExpertiseChange}
                >
                    <option value="">Select Expertise</option>
                    {categories.map((category) => (
                        <option key={category._id} value={category._id}>
                            {category.name}
                        </option>
                    ))}
                </select>

                {expertise && (
                    <select
                        className="w-full p-3 rounded-2xl border border-gray-300"
                        value={selectedSpecialization}
                        onChange={handleSpecializationChange}
                    >
                        <option value="">Select Specialization</option>
                        {specializations.map((spec) => (
                            <option key={spec._id} value={spec._id}>
                                {spec.name}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <select
                    className="w-full p-3 rounded-2xl border border-gray-300"
                    value={formData.highestQualification}
                    onChange={(e) =>
                        setFormData({ ...formData, highestQualification: e.target.value })
                    }
                >
                    <option value="">Select highest qualification</option>
                    <option value="Bachelor's Degree">Bachelor's Degree</option>
                    <option value="Master's Degree">Master's Degree</option>
                    <option value="PhD">PhD</option>
                    <option value="Diploma">Diploma</option>
                    <option value="Certificate">Certificate</option>
                    <option value="Others">Others</option>
                </select>

                <select
                    className="w-full p-3 rounded-2xl border border-gray-300"
                    value={hasCertificate}
                    onChange={handleCertificateOptionChange}
                >
                    <option value="No">Relevant certificates?</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                </select>
            </div>

            <input
                type="text"
                placeholder="Enter years of experience"
                className="w-full p-3 rounded-2xl border border-gray-300"
                value={formData.yearOfExperience}
                onChange={(e) =>
                    setFormData({ ...formData, yearOfExperience: e.target.value })
                }
            />

            {/* Profile Picture Upload */}
            <UploadBox
                label="Upload Profile Picture (.jpg, .jpeg, .png)"
                accept=".jpg,.jpeg,.png"
                file={profilePicture}
                setFile={setProfilePicture}
                inputRef={profilePictureInputRef}
            />

            {/* CV Upload */}
            <UploadBox
                label="Upload Your CV (PDF, DOC, DOCX)"
                accept=".pdf,.doc,.docx"
                file={cv}
                setFile={setCv}
                inputRef={cvInputRef}
            />

            {/* Profile Video Upload */}
            <UploadBox
                label="Upload a Profile Video"
                accept="video/*"
                file={profileVideo}
                setFile={setProfileVideo}
                inputRef={videoInputRef}
            />

            {/* Conditional Certificate Upload Field */}
            {hasCertificate === "Yes" && (
                <UploadBox
                    label="Upload Relevant Certificates (PDF, DOC, JPG, PNG)"
                    accept=".pdf,.doc,.jpg,.jpeg,.png"
                    file={relevantCertificate}
                    setFile={setRelevantCertificate}
                    inputRef={certificateInputRef}
                />
            )}
        </div>
    );
}

function UploadBox({ label, accept, file, setFile, inputRef }) {
    return (
        <div className="border-2 border-dashed border-gray-300 p-4 rounded-xl text-center hover:border-orange-400 transition">
            <label className="block mb-1 text-sm font-medium text-gray-700">{label}</label>

            <input
                type="file"
                accept={accept}
                ref={inputRef}
                className="hidden"
                onChange={(e) => setFile(e.target.files[0])}
            />

            {!file ? (
                <div>
                    <FiUploadCloud className="mx-auto text-2xl text-gray-400 mb-1" />
                    <button
                        type="button"
                        className="cursor-pointer text-blue-600 text-sm font-medium"
                        onClick={() => inputRef.current?.click()}
                    >
                        Click to Upload
                    </button>
                </div>
            ) : (
                <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                    <span className="text-xs text-gray-700 truncate">{file.name}</span>
                    <div className="flex gap-1">
                        <button
                            type="button"
                            className="text-blue-600 hover:text-blue-800 text-sm"
                            onClick={() => inputRef.current?.click()}
                        >
                            <FiEdit2 />
                        </button>
                        <button
                            type="button"
                            className="text-red-600 hover:text-red-800 text-sm"
                            onClick={() => setFile(null)}
                        >
                            <FiTrash2 />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
