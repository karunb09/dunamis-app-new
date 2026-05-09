import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Select from "react-select";
import {
    createBranch,
    fetchAllBranches,
    fetchBranchById,
    updateBranch,
} from "../../../redux/Branch/branchSlice";
import { getAllUsers } from "../../../redux/User/UserSlice";
import { fetchTeachers } from "../../../redux/Intructor/teacherSlice";
import { deleteCity, getAllCities } from "../../../redux/City/CitySlice";
import { Upload } from "phosphor-react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { resolveImageUrl } from "../../../utils/resolveImageUrl";

const AddBranch = () => {
    const { id } = useParams();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const daysRef = useRef();

    const [formData, setFormData] = useState({
        branchName: "",
        location: "",
        zone: "",
        city: "",
        branchManager: "",
        branchAdminContact: "",
        branchAdminEmail: "",
        startTime: "",
        endTime: "",
        branchOpenDays: [],
        branchCapacity: "",
        centreFacilities: "",
        branchImage: null,
        teachers: [],
    });

    const [showDaysDropdown, setShowDaysDropdown] = useState(false);

    const { loading, error, selectedBranch } = useSelector(
        (state) => state.branch
    );

    const { users = [], loading: usersLoading, error: usersError, listStatus: userListStatus } = useSelector(
        (state) => state.user
    );
    const { cities = [], loading: citiesLoading, listStatus: cityListStatus } = useSelector(
        (state) => state.city
    );
    const {
        teachers: instructorRecords = [],
        loading: instructorsLoading,
        error: instructorsError,
    } = useSelector((state) => state.teachers);

    const branchFallbackImage = `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(
        formData.branchName || selectedBranch?.branchName || "Branch"
    )}`;

    // Fetch users and cities
    useEffect(() => {
        if (userListStatus === "idle") {
            dispatch(getAllUsers());
        }
    }, [dispatch, userListStatus]);

    useEffect(() => {
        if (cityListStatus === "idle") {
            dispatch(getAllCities());
        }
    }, [dispatch, cityListStatus]);

    useEffect(() => {
        dispatch(fetchTeachers());
    }, [dispatch]);

    useEffect(() => {
        if (id) {
            dispatch(fetchBranchById(id));
        }
    }, [dispatch, id]);

    useEffect(() => {
        if (error) {
            toast.error(`Error: ${error}`);
        }
    }, [error]);

    useEffect(() => {
        if (id && selectedBranch?._id === id) {
            setFormData({
                branchName: selectedBranch.branchName || "",
                location: selectedBranch.location || "",
                zone: selectedBranch.zone || "",
                city: selectedBranch.city?._id || selectedBranch.city || "",
                branchManager:
                    selectedBranch.branchManager?._id || selectedBranch.branchManager || "",
                branchAdminContact: selectedBranch.branchAdminContact || "",
                branchAdminEmail: selectedBranch.branchAdminEmail || "",
                startTime: selectedBranch.branchTimings?.[0] || "",
                endTime: selectedBranch.branchTimings?.[1] || "",
                branchOpenDays: selectedBranch.branchOpenDays || [],
                branchCapacity: String(selectedBranch.branchCapacity || ""),
                centreFacilities: selectedBranch.centreFacilities || "",
                branchImage: null,
                teachers: (selectedBranch.teachers || []).map((teacher) => ({
                    value: teacher._id || teacher.id,
                    label: getInstructorLabel(teacher),
                })).filter((teacher) => teacher.value),
            });
        }
    }, [id, selectedBranch]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (daysRef.current && !daysRef.current.contains(e.target)) {
                setShowDaysDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        return () => {
            if (formData.branchImage) URL.revokeObjectURL(formData.branchImage);
        };
    }, [formData.branchImage]);

    // Handle input change
    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === "branchManager") {
            const selected = users.find((u) => u._id === value);
            if (selected && selected.email && selected.mobileNo != null) {
                setFormData({
                    ...formData,
                    branchManager: value,
                    branchAdminEmail: selected.email,
                    branchAdminContact: String(selected.mobileNo),
                });
            } else {
                setFormData({
                    ...formData,
                    branchManager: value,
                    branchAdminEmail: "",
                    branchAdminContact: "",
                });
            }
        } else if (name === "zone") {
            setFormData({ ...formData, zone: value.replace(/\D/g, "") });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const toggleDay = (day) => {
        setFormData((prev) => {
            const arr = prev.branchOpenDays.includes(day)
                ? prev.branchOpenDays.filter((d) => d !== day)
                : [...prev.branchOpenDays, day];
            return { ...prev, branchOpenDays: arr };
        });
    };

    const handleCancel = () => {
        setFormData({
            branchName: "",
            location: "",
            zone: "",
            city: "",
            branchManager: "",
            branchAdminContact: "",
            branchAdminEmail: "",
            startTime: "",
            endTime: "",
            branchOpenDays: [],
            branchCapacity: "",
            centreFacilities: "",
            branchImage: null,
            teachers: [],
        });
        navigate("/admin/centers");
    };

    const buildPayload = (status) => {
        const required = [
            "branchName",
            "location",
            "zone",
            "city",
            "branchManager",
            "branchAdminEmail",
            "branchAdminContact",
            "startTime",
            "endTime",
            "branchOpenDays",
            "branchCapacity",
        ];

        for (const field of required) {
            if (!formData[field] || (Array.isArray(formData[field]) && formData[field].length === 0)) {
                throw new Error(`Please fill ${field}`);
            }
        }

        if (!/^\d{10}$/.test(String(formData.branchAdminContact))) {
            throw new Error("Branch admin contact must be 10 digits.");
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.branchAdminEmail)) {
            throw new Error("Branch admin email must be valid.");
        }

        if (!Number.isFinite(Number(formData.branchCapacity)) || Number(formData.branchCapacity) <= 0) {
            throw new Error("Branch capacity must be a positive number.");
        }

        if (formData.startTime === formData.endTime) {
            throw new Error("Start time and end time must be different.");
        }

        const img = formData.branchImage;
        if (img) {
            if (!(img instanceof File) || !img.type.startsWith("image/")) {
                throw new Error("Please upload a valid image file.");
            }
            if (img.size > 5 * 1024 * 1024) {
                throw new Error("Image too large. Must be under 5MB.");
            }
        }

        const payload = new FormData();
        payload.append("branchName", formData.branchName);
        payload.append("location", formData.location);
        payload.append("zone", formData.zone);
        payload.append("city", formData.city);
        payload.append("branchManager", formData.branchManager);
        payload.append("branchAdminEmail", formData.branchAdminEmail);
        payload.append("branchAdminContact", formData.branchAdminContact);
        payload.append(
            "branchTimings",
            JSON.stringify([formData.startTime, formData.endTime])
        );
        payload.append("branchOpenDays", JSON.stringify(formData.branchOpenDays));
        payload.append("branchCapacity", formData.branchCapacity);
        payload.append("centreFacilities", formData.centreFacilities || "");
        payload.append(
            "teachers",
            JSON.stringify((formData.teachers || []).map((teacher) => teacher.value || teacher))
        );
        payload.append("status", status);
        if (formData.branchImage) {
            payload.append("branchImage", formData.branchImage);
        }

        return payload;
    };

    const saveBranch = async (status) => {
        let toastId;
        try {
            const payload = buildPayload(status);
            toastId = toast.loading(
                id
                    ? status === "draft"
                        ? "Updating draft..."
                        : "Updating branch..."
                    : status === "draft"
                        ? "Saving draft..."
                        : "Saving branch..."
            );

            if (id) {
                await dispatch(updateBranch({ id, branchData: payload })).unwrap();
            } else {
                await dispatch(createBranch(payload)).unwrap();
            }

            dispatch(fetchAllBranches());

            toast.success(
                id
                    ? status === "draft"
                        ? "Branch draft updated!"
                        : "Branch updated successfully!"
                    : status === "draft"
                        ? "Branch saved to drafts!"
                        : "Branch created successfully!"
            );
            navigate("/admin/centers");
        } catch (saveError) {
            const message =
                typeof saveError === "string"
                    ? saveError
                    : saveError?.message || "Failed to save branch";
            toast.error(message);
        } finally {
            if (toastId) {
                toast.dismiss(toastId);
            }
        }
    };

    const handleSaveDraft = async () => {
        await saveBranch("draft");
    };

    const handleSaveBranch = async () => {
        await saveBranch("active");
    };

    const handleDeleteCity = () => {
        if (!formData.city) {
            toast.error("Select a city first");
            return;
        }

        const selectedCity = cities.find((city) => city._id === formData.city);

        Swal.fire({
            title: "Delete city?",
            text: `This will delete ${selectedCity?.cityName || "the selected city"}.`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            confirmButtonText: "Delete",
        }).then(async (result) => {
            if (!result.isConfirmed) return;

            try {
                await dispatch(deleteCity(formData.city)).unwrap();
                toast.success("City deleted successfully");
                setFormData((prev) => ({ ...prev, city: "" }));
            } catch (deleteError) {
                toast.error(deleteError?.message || "Failed to delete city");
            }
        });
    };

    function getInstructorLabel(instructor) {
        const detailName = instructor?.teacherDetail?.name;
        const userName = instructor?.user?.name || instructor?.userId?.name;
        const nameSource = detailName || userName || instructor?.name;

        if (typeof nameSource === "string" && nameSource.trim()) {
            return nameSource.trim();
        }

        const fullName = `${nameSource?.firstName || ""} ${nameSource?.lastName || ""}`.trim();
        const expertise =
            instructor?.teacherApplication?.areaOfExpertise ||
            instructor?.teacherDetail?.areaOfExpertise;

        return `${fullName || "Instructor"}${expertise ? ` (${expertise})` : ""}`;
    }

    const instructorOptions = (instructorRecords || [])
        .filter((instructor) => {
            const mode =
                instructor?.teacherApplication?.mode ||
                instructor?.teacherDetail?.mode ||
                "";
            return !mode || String(mode).toLowerCase() === "offline";
        })
        .map((instructor) => ({
            value: instructor.id || instructor._id,
            label: getInstructorLabel(instructor),
        }))
        .filter((option) => option.value);

    return (
        <div className="p-6 bg-gray-50 rounded-2xl">
            <h2 className="text-lg font-semibold mb-4">
                {id ? "Edit Branch" : "Create New Branch"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Branch Name */}
                <label>
                    Branch Name
                    <input
                        type="text"
                        name="branchName"
                        value={formData.branchName}
                        onChange={handleChange}
                        className="p-3 border rounded-2xl w-full"
                    />
                </label>

                {/* Location */}
                <label>
                    Location
                    <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        className="p-3 border rounded-2xl w-full"
                    />
                </label>

                {/* Zone */}
                <label>
                    Zone
                    <input
                        type="text"
                        name="zone"
                        value={formData.zone}
                        onChange={handleChange}
                        className="p-3 border rounded-2xl w-full"
                        inputMode="numeric"
                        placeholder="Enter zone number"
                    />
                </label>

                {/* City */}
                <label>
                    City
                    <select
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        className="p-3 border rounded-2xl w-full"
                        disabled={citiesLoading}
                    >
                        <option value="">Select City</option>
                        {cities.map((c) => (
                            <option key={c._id} value={c._id}>
                                {c.cityName}
                            </option>
                        ))}
                    </select>
                    <div className="mt-2 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => navigate("/admin/centers/add-city")}
                            className="rounded-xl border px-3 py-1 text-sm hover:bg-gray-100"
                        >
                            Add City
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate(`/admin/centers/add-city/${formData.city}`)}
                            disabled={!formData.city}
                            className="rounded-xl border px-3 py-1 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Edit City
                        </button>
                        <button
                            type="button"
                            onClick={handleDeleteCity}
                            disabled={!formData.city}
                            className="rounded-xl border border-red-500 px-3 py-1 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Delete City
                        </button>
                    </div>
                </label>

                {/* Branch Manager */}
                <label>
                    Branch Manager
                    <select
                        name="branchManager"
                        value={formData.branchManager}
                        onChange={handleChange}
                        className="p-3 border rounded-2xl w-full"
                        disabled={usersLoading}
                    >
                        <option value="">Select Branch Manager</option>
                        {usersLoading ? (
                            <option>Loading...</option>
                        ) : usersError ? (
                            <option>{usersError}</option>
                        ) : (
                            users
                                .filter((u) => u.roleModel === "admin")
                                .map((u) => (
                                    <option key={u._id} value={u._id}>
                                        {u.name.firstName} {u.name.lastName}
                                    </option>
                                ))
                        )}
                    </select>
                </label>

                <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">
                        Branch Instructors
                    </label>
                    <Select
                        isMulti
                        options={instructorOptions}
                        value={formData.teachers}
                        onChange={(selectedOptions) =>
                            setFormData((prev) => ({
                                ...prev,
                                teachers: selectedOptions || [],
                            }))
                        }
                        isDisabled={instructorsLoading}
                        placeholder={
                            instructorsLoading
                                ? "Loading offline instructors..."
                                : "Select instructors for this branch"
                        }
                        noOptionsMessage={() =>
                            instructorsError || "No offline instructors found"
                        }
                        className="w-full"
                        styles={{
                            control: (base, state) => ({
                                ...base,
                                minHeight: 48,
                                borderRadius: 16,
                                borderColor: state.isFocused ? "#111827" : "#e5e7eb",
                                boxShadow: state.isFocused ? "0 0 0 1px #111827" : "none",
                                "&:hover": { borderColor: "#111827" },
                            }),
                            multiValue: (base) => ({
                                ...base,
                                borderRadius: 999,
                                backgroundColor: "#f3f4f6",
                            }),
                        }}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        These instructors will appear as branch instructors and can be used for offline scheduling.
                    </p>
                </div>

                {/* Branch Admin Contact */}
                {formData.branchAdminContact && (
                    <label>
                        Branch Admin Contact
                        <input
                            type="text"
                            name="branchAdminContact"
                            value={formData.branchAdminContact}
                            readOnly
                            className="p-3 border rounded-2xl w-full bg-gray-100 cursor-not-allowed"
                        />
                    </label>
                )}

                {/* Branch Admin Email */}
                {formData.branchAdminEmail && (
                    <label>
                        Branch Admin Email
                        <input
                            type="email"
                            name="branchAdminEmail"
                            value={formData.branchAdminEmail}
                            readOnly
                            className="p-3 border rounded-2xl w-full bg-gray-100 cursor-not-allowed"
                        />
                    </label>
                )}

                {/* Branch Capacity */}
                <label>
                    Branch Capacity
                    <input
                        type="number"
                        name="branchCapacity"
                        value={formData.branchCapacity}
                        onChange={handleChange}
                        className="p-3 border rounded-2xl w-full"
                    />
                </label>

                {/* Branch Timings */}
                <div>
                    <label>Branch Timings</label>
                    <div className="flex gap-2">
                        <input
                            type="time"
                            name="startTime"
                            value={formData.startTime}
                            onChange={handleChange}
                            className="p-3 border rounded-2xl w-full"
                        />
                        <input
                            type="time"
                            name="endTime"
                            value={formData.endTime}
                            onChange={handleChange}
                            className="p-3 border rounded-2xl w-full"
                        />
                    </div>
                </div>

                {/* Branch Open Days */}
                <div className="relative" ref={daysRef}>
                    <label>Branch Open Days</label>
                    <div
                        onClick={() => setShowDaysDropdown(!showDaysDropdown)}
                        className="p-3 border rounded-2xl cursor-pointer w-full bg-white"
                    >
                        {formData.branchOpenDays.length > 0
                            ? formData.branchOpenDays.join(", ")
                            : "Select Days"}
                    </div>
                    {showDaysDropdown && (
                        <div className="absolute bg-white shadow-md rounded-lg mt-2 p-4 z-10 w-full">
                            {[
                                "Monday",
                                "Tuesday",
                                "Wednesday",
                                "Thursday",
                                "Friday",
                                "Saturday",
                                "Sunday",
                            ].map((day) => (
                                <div key={day} className="flex items-center mb-1">
                                    <input
                                        type="checkbox"
                                        id={day}
                                        checked={formData.branchOpenDays.includes(day)}
                                        onChange={() => toggleDay(day)}
                                        className="mr-2"
                                    />
                                    <label htmlFor={day}>{day}</label>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Centre Facilities */}
            <label className="mt-4 block">
                Centre Facilities (Optional)
                <textarea
                    name="centreFacilities"
                    value={formData.centreFacilities}
                    onChange={handleChange}
                    rows="4"
                    className="p-3 border rounded-2xl w-full mt-2"
                    placeholder="Enter details (Optional)"
                />
            </label>

            {/* Branch Image Upload */}
            <div className="mt-4">
                <label className="block mb-2 font-small">Branch Image</label>
                <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 bg-gray-50 hover:bg-gray-100 transition cursor-pointer">
                    {formData.branchImage ? (
                        <img
                            src={URL.createObjectURL(formData.branchImage)}
                            alt="Branch Preview"
                            className="w-32 h-32 object-cover rounded-xl mb-2"
                        />
                    ) : id && selectedBranch ? (
                        <img
                            src={resolveImageUrl(
                                selectedBranch.branchImage,
                                branchFallbackImage
                            )}
                            alt="Branch Preview"
                            className="w-32 h-32 object-cover rounded-xl mb-2"
                        />
                    ) : (
                        <Upload className="text-gray-600 text-4xl" />
                    )}
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                            const file = e.target.files[0];
                            if (file)
                                setFormData((prev) => ({ ...prev, branchImage: file }));
                        }}
                        className="hidden"
                        id="branchImage"
                    />
                    <label
                        htmlFor="branchImage"
                        className="cursor-pointer text-sm text-blue-600 hover:text-blue-950"
                    >
                        {formData.branchImage ? "Change Image" : "Upload Image"}
                    </label>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between mt-6">
                <button
                    onClick={handleCancel}
                    className="bg-white flex items-center gap-2 border px-4 py-2 rounded-2xl text-black hover:bg-gray-200"
                >
                    Cancel
                </button>
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleSaveDraft}
                        className="bg-white flex items-center gap-2 border px-4 py-2 rounded-2xl text-black hover:bg-gray-200"
                    >
                        Save Draft
                    </button>
                    <button
                        onClick={handleSaveBranch}
                        disabled={loading}
                        className="flex items-center gap-2 bg-black text-white px-6 py-2 rounded-2xl hover:bg-gray-900"
                    >
                        {loading ? "Saving..." : id ? "Update Branch" : "Save Branch"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddBranch;
