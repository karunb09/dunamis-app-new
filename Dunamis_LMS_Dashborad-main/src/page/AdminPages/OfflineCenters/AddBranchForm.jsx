import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { createBranch } from "../../../redux/Branch/branchSlice";
import { getAllUsers } from "../../../redux/User/UserSlice";
import { getAllCities } from "../../../redux/City/CitySlice";
import { getAllZones } from "../../../redux/Zone/ZoneSlice";
import { Upload } from "phosphor-react";
import toast from "react-hot-toast";

const AddBranch = () => {
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
    });

    const [showDaysDropdown, setShowDaysDropdown] = useState(false);

    const { loading, branch: createdBranch, error } = useSelector(
        (state) => state.branch
    );

    const { users = [], loading: usersLoading, error: usersError } = useSelector(
        (state) => state.user
    );
    const { zones = [], loading: zonesLoading, error: zonesError } = useSelector(
        (state) => state.zone
    );
    const { cities = [], loading: citiesLoading, error: citiesError } = useSelector(
        (state) => state.city
    );

    // Fetch users, cities, zones
    useEffect(() => {
        if (!usersLoading && users.length === 0) dispatch(getAllUsers());
    }, [dispatch, usersLoading, users.length]);

    useEffect(() => {
        if (!citiesLoading && cities.length === 0) dispatch(getAllCities());
    }, [dispatch, citiesLoading, cities.length]);

    useEffect(() => {
        if (!zones.length && !zonesLoading) dispatch(getAllZones());
    }, [dispatch, zones, zonesLoading]);

    useEffect(() => {
        console.log("Fetched Zones:", zones);
    }, [zones]);

    useEffect(() => {
        if (createdBranch) {
            toast.success("Branch created successfully!");
            navigate("/admin/centers");
        }
    }, [createdBranch, navigate]);

    useEffect(() => {
        if (error) {
            toast.error(`Error: ${error}`);
        }
    }, [error]);

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
        });
        navigate("/admin/centers");
    };

    const handleSaveDraft = () => {
        console.log("Draft:", formData);
        toast("Draft saved!"); 
    };

    const handleSaveBranch = async () => {
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
            "branchCapacity",
            "branchImage",
        ];

        for (const field of required) {
            if (!formData[field]) {
                alert(`Please fill ${field}`);
                return;
            }
        }

        if (formData.startTime === formData.endTime) {
            alert("Start time and end time must be different.");
            return;
        }

        const img = formData.branchImage;
        if (!(img instanceof File) || !img.type.startsWith("image/")) {
            alert("Please upload a valid image file.");
            return;
        }
        if (img.size > 5 * 1024 * 1024) {
            alert("Image too large. Must be under 5MB.");
            return;
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
        payload.append("status", "active");
        payload.append("branchImage", formData.branchImage);

        const toastId = toast.loading("Saving branch...");
        await dispatch(createBranch(payload));
        toast.dismiss(toastId);
    };

    // Filter cities by selected zone
    const filteredCities =
        formData.zone && zones.length
            ? (() => {
                const zoneObj = zones.find((z) => z._id === formData.zone);
                if (!zoneObj || !zoneObj.city) return [];
                return cities.filter((c) => zoneObj.city.includes(c._id));
            })()
            : [];

    return (
        <div className="p-6 bg-gray-50 rounded-2xl">
            <h2 className="text-lg font-semibold mb-4">Create New Branch</h2>
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
                    <select
                        name="zone"
                        value={formData.zone}
                        onChange={handleChange}
                        className="p-3 border rounded-2xl w-full"
                        disabled={zonesLoading}
                    >
                        <option value="">Select Zone</option>
                        {zonesLoading ? (
                            <option>Loading...</option>
                        ) : zonesError ? (
                            <option>{zonesError}</option>
                        ) : (
                            zones.map((z) => (
                                <option key={z._id} value={z._id}>
                                    {z.name}
                                </option>
                            ))
                        )}
                    </select>
                </label>

                {/* City */}
                <label>
                    City
                    <select
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        className="p-3 border rounded-2xl w-full"
                        disabled={!formData.zone}
                    >
                        <option value="">Select City</option>
                        {filteredCities.length > 0 ? (
                            filteredCities.map((c) => (
                                <option key={c._id} value={c._id}>
                                    {c.cityName}
                                </option>
                            ))
                        ) : (
                            <option>No cities for this zone</option>
                        )}
                    </select>
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
                        {loading ? "Saving..." : "Save Branch"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddBranch;
