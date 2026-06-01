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
  const { categories, subCategories } = useSelector((state) => state.category);

  const [expertiseId, setExpertiseId] = useState("");
  // Multiple specializations can now be selected.
  const [selectedSpecIds, setSelectedSpecIds] = useState([]);
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
    dispatch(fetchCategories());
  }, [dispatch]);

  const visibleCategories = useMemo(
    () => categories.filter((category) => category.status === "published" || !category.status),
    [categories]
  );

  const availableSpecializations = useMemo(() => {
    if (!expertiseId) return [];
    return subCategories.filter((subCategory) => subCategory.categoryId === expertiseId);
  }, [expertiseId, subCategories]);

  const handleExpertiseChange = (event) => {
    const selectedCategoryId = event.target.value;
    const selectedCategory = visibleCategories.find((category) => category._id === selectedCategoryId);

    setExpertiseId(selectedCategoryId);
    setSelectedSpecIds([]);
    setFormData({
      ...formData,
      areaOfExpertise: selectedCategory?.name || "",
      specialization: "",
    });
  };

  const handleToggleSpecialization = (subCategory) => {
    const isSelected = selectedSpecIds.includes(subCategory._id);
    const nextIds = isSelected
      ? selectedSpecIds.filter((id) => id !== subCategory._id)
      : [...selectedSpecIds, subCategory._id];

    setSelectedSpecIds(nextIds);

    // Keep formData.specialization as a comma-separated string of names.
    const names = availableSpecializations
      .filter((item) => nextIds.includes(item._id))
      .map((item) => item.name);

    setFormData({
      ...formData,
      specialization: names.join(", "),
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
          {visibleCategories.map((category) => (
            <option key={category._id} value={category._id}>
              {category.name}
            </option>
          ))}
        </SelectInput>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Specialization{" "}
            <span className="text-xs font-normal text-gray-400">
              (select one or more)
            </span>
          </label>
          {!expertiseId ? (
            <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-3 text-sm text-gray-400">
              Select an area of expertise first
            </div>
          ) : availableSpecializations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-3 text-sm text-gray-400">
              No specializations available for this expertise
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 rounded-2xl border border-gray-200 p-3">
              {availableSpecializations.map((specialization) => {
                const isSelected = selectedSpecIds.includes(specialization._id);
                return (
                  <button
                    key={specialization._id}
                    type="button"
                    onClick={() => handleToggleSpecialization(specialization)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                      isSelected
                        ? "border-orange-500 bg-orange-500 text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:border-orange-300 hover:bg-orange-50"
                    }`}
                  >
                    {specialization.name}
                  </button>
                );
              })}
            </div>
          )}
          {errors.specialization ? (
            <p className="mt-1 text-sm text-red-500">{errors.specialization}</p>
          ) : null}
        </div>

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
