import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCategories } from "@/store/categorySlice";
import {
  FileUploadField,
  SelectInput,
  TextInput,
} from "./FormFields";
import ProfileImageCropper from "@/compoents/ProfileImageCropper";

export default function Step3Professional({
  formData,
  setFormData,
  errors = {},
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
  const { categories, subCategories, status } = useSelector((state) => state.category);

  const [expertiseId, setExpertiseId] = useState("");
  const [specializationId, setSpecializationId] = useState("");
  const [hasCertificate, setHasCertificate] = useState(
    relevantCertificate ? "Yes" : "No"
  );
  const [pendingCropFile, setPendingCropFile] = useState(null);
  const [profilePreviewUrl, setProfilePreviewUrl] = useState("");

  useEffect(() => {
    return () => {
      if (profilePreviewUrl) URL.revokeObjectURL(profilePreviewUrl);
    };
  }, [profilePreviewUrl]);

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchCategories());
    }
  }, [status, dispatch]);

  const availableSpecializations = useMemo(() => {
    if (!expertiseId) return [];
    return subCategories.filter((subCategory) => subCategory.categoryId === expertiseId);
  }, [expertiseId, subCategories]);

  const handleExpertiseChange = (event) => {
    const selectedCategoryId = event.target.value;
    const selectedCategory = categories.find((category) => category._id === selectedCategoryId);

    setExpertiseId(selectedCategoryId);
    setSpecializationId("");
    setFormData({
      ...formData,
      areaOfExpertise: selectedCategory?.name || "",
      specialization: "",
    });
  };

  const handleSpecializationChange = (event) => {
    const selectedId = event.target.value;
    const selectedSubCategory = availableSpecializations.find(
      (subCategory) => subCategory._id === selectedId
    );

    setSpecializationId(selectedId);
    setFormData({
      ...formData,
      specialization: selectedSubCategory?.name || "",
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <SelectInput
          id="teacher-expertise"
          label="Area of Expertise"
          value={expertiseId}
          onChange={handleExpertiseChange}
          error={errors.areaOfExpertise}
          required
        >
          <option value="">Select expertise</option>
          {categories.map((category) => (
            <option key={category._id} value={category._id}>
              {category.name}
            </option>
          ))}
        </SelectInput>

        <SelectInput
          id="teacher-specialization"
          label="Specialization"
          value={specializationId}
          onChange={handleSpecializationChange}
          disabled={!expertiseId}
        >
          <option value="">Select specialization</option>
          {availableSpecializations.map((specialization) => (
            <option key={specialization._id} value={specialization._id}>
              {specialization.name}
            </option>
          ))}
        </SelectInput>

        <SelectInput
          id="teacher-qualification"
          label="Highest Qualification"
          value={formData.highestQualification}
          onChange={(e) =>
            setFormData({ ...formData, highestQualification: e.target.value })
          }
          error={errors.highestQualification}
          required
        >
          <option value="">Select highest qualification</option>
          <option value="Bachelor's Degree">Bachelor&apos;s Degree</option>
          <option value="Master's Degree">Master&apos;s Degree</option>
          <option value="PhD">PhD</option>
          <option value="Diploma">Diploma</option>
          <option value="Certificate">Certificate</option>
          <option value="Others">Others</option>
        </SelectInput>

        <TextInput
          id="teacher-experience"
          label="Years of Experience"
          type="number"
          min="0"
          placeholder="Enter years of experience"
          value={formData.yearOfExperience}
          onChange={(e) =>
            setFormData({ ...formData, yearOfExperience: e.target.value })
          }
          error={errors.yearOfExperience}
          required
        />

        <SelectInput
          id="teacher-certificate-toggle"
          label="Do you have relevant certificates?"
          value={hasCertificate}
          onChange={(e) => {
            const value = e.target.value;
            setHasCertificate(value);
            if (value === "No") {
              setRelevantCertificate(null);
            }
          }}
          className="md:col-span-2"
        >
          <option value="No">No</option>
          <option value="Yes">Yes</option>
        </SelectInput>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <FileUploadField
          label="Profile Picture"
          accept=".jpg,.jpeg,.png,image/jpeg,image/png"
          helperText="JPG or PNG only. Crop your face after selecting the image."
          file={profilePicture}
          error={errors.profilePicture}
          setFile={(file) => {
            if (!file) {
              setProfilePicture(null);
              if (profilePreviewUrl) URL.revokeObjectURL(profilePreviewUrl);
              setProfilePreviewUrl("");
              return;
            }

            setPendingCropFile(file);
          }}
          inputRef={profilePictureInputRef}
          required
        />

        <FileUploadField
          label="CV"
          accept=".pdf,application/pdf"
          helperText="PDF only"
          file={cv}
          error={errors.cv}
          setFile={setCv}
          inputRef={cvInputRef}
          required
        />

        <FileUploadField
          label="Profile Video"
          accept=".mp4,.mpeg,.avi,.mov,video/mp4,video/mpeg,video/avi,video/quicktime"
          helperText="MP4, MPEG, AVI, or MOV"
          file={profileVideo}
          error={errors.profileVideo}
          setFile={setProfileVideo}
          inputRef={videoInputRef}
          required
        />

        {hasCertificate === "Yes" ? (
          <FileUploadField
            label="Relevant Certificate"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            helperText="PDF, JPG, or PNG"
            file={relevantCertificate}
            error={errors.relevantCertificate}
            setFile={setRelevantCertificate}
            inputRef={certificateInputRef}
          />
        ) : null}
      </div>

      {profilePreviewUrl ? (
        <div className="rounded-3xl border border-orange-100 bg-orange-50/60 p-4">
          <p className="text-sm font-semibold text-gray-900">Cropped profile preview</p>
          <div className="mt-3 flex items-center gap-4">
            <img
              src={profilePreviewUrl}
              alt="Cropped profile preview"
              className="h-20 w-20 rounded-full object-cover object-top ring-4 ring-white"
            />
            <p className="text-sm text-gray-600">
              This is the image that will appear on instructor cards and course
              pages.
            </p>
          </div>
        </div>
      ) : null}

      <ProfileImageCropper
        file={pendingCropFile}
        onApply={(croppedFile, previewUrl) => {
          if (profilePreviewUrl) URL.revokeObjectURL(profilePreviewUrl);
          setProfilePicture(croppedFile);
          setProfilePreviewUrl(previewUrl);
          setPendingCropFile(null);
          if (profilePictureInputRef.current) {
            profilePictureInputRef.current.value = "";
          }
        }}
        onCancel={() => {
          setPendingCropFile(null);
          if (profilePictureInputRef.current) {
            profilePictureInputRef.current.value = "";
          }
        }}
      />
    </div>
  );
}
