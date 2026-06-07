import React, { useState, useEffect } from "react";
import { FaSave } from "react-icons/fa";
import { MdCancel } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Select from "react-select";
import { getAllCities } from "../../../redux/City/CitySlice";
import { getAllUsers } from "../../../redux/User/UserSlice";
import { createZone } from "../../../redux/Zone/ZoneSlice";
import toast from "react-hot-toast";

const AddZone = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        zoneName: "",
        location: "",
        zoneManager: "",
        zoneAdminContact: "",
        zoneAdminEmail: "",
        cities: [], // multi-select: array of city IDs
    });

    const { users, listStatus: userListStatus } = useSelector((state) => state.user);
    const { cities, listStatus: cityListStatus } = useSelector((state) => state.city);
    const { loading } = useSelector((state) => state.zone);

    // Fetch cities and users
    useEffect(() => {
        if (cityListStatus === "idle") {
            dispatch(getAllCities());
        }
        if (userListStatus === "idle") {
            dispatch(getAllUsers());
        }
    }, [dispatch, cityListStatus, userListStatus]);

    // Handle input fields
    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === "zoneManager") {
            const selectedUser = users.find((user) => user._id === value);
            if (selectedUser) {
                setFormData({
                    ...formData,
                    zoneManager: value,
                    zoneAdminEmail: selectedUser.email,
                    zoneAdminContact: selectedUser.mobileNo?.toString() || "",
                });
            } else {
                setFormData({
                    ...formData,
                    zoneManager: value,
                    zoneAdminEmail: "",
                    zoneAdminContact: "",
                });
            }
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    // Handle city multiselect
    const handleCityChange = (selectedOptions) => {
        setFormData({
            ...formData,
            cities: selectedOptions ? selectedOptions.map((opt) => opt.value) : [],
        });
    };

    // Save Zone
    const handleSaveZone = async () => {
        const requiredFields = [
            ["zoneName", "Zone name"],
            ["location", "Location"],
            ["zoneManager", "Zone manager"],
            ["zoneAdminEmail", "Zone admin email"],
            ["zoneAdminContact", "Zone admin contact"],
            ["cities", "At least one city"],
        ];

        for (const [field, label] of requiredFields) {
            if (!formData[field] || (Array.isArray(formData[field]) && formData[field].length === 0)) {
                toast.error(`${label} is required`);
                return;
            }
        }

        if (!/^\d{10}$/.test(String(formData.zoneAdminContact))) {
            toast.error("Zone admin contact must be 10 digits");
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.zoneAdminEmail)) {
            toast.error("Zone admin email must be valid");
            return;
        }

        const payload = {
            name: formData.zoneName.trim(),
            location: formData.location.trim(),
            manager: formData.zoneManager,
            adminEmail: formData.zoneAdminEmail,
            adminContact: formData.zoneAdminContact,
            city: formData.cities,
        };

        try {
            const action = await dispatch(createZone(payload));

            if (createZone.fulfilled.match(action)) {
                toast.success("Zone created successfully!");
                navigate("/admin/centers");
            } else {
                throw new Error(action.payload?.message || action.error?.message || "Failed to create zone");
            }
        } catch (error) {
            toast.error(error.message || "Something went wrong");
        }
    };


    const handleSaveDraft = () => {
        console.log("Draft saved:", formData);
    };

    const handleCancel = () => {
        setFormData({
            zoneName: "",
            location: "",
            zoneManager: "",
            zoneAdminContact: "",
            zoneAdminEmail: "",
            cities: [],
        });
        navigate("/admin/centers");
    };

    // Prepare city options for Select
    const cityOptions = (cities || []).map((city) => ({
        value: city._id,
        label: city.cityName,
    }));

    return (
        <div className="p-6 bg-gray-50 rounded-2xl">
            <h2 className="text-lg font-semibold mb-4">Create New Zone</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Zone Name */}
                <label htmlFor="zoneName">Zone Name <span className="text-red-500">*</span>
                    <input
                        type="text"
                        name="zoneName"
                        value={formData.zoneName}
                        onChange={handleChange}
                        className="p-3 border rounded-2xl w-full"
                        required
                    />
                </label>

                {/* Location */}
                <label htmlFor="location">Location <span className="text-red-500">*</span>
                    <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        className="p-3 border rounded-2xl w-full"
                        required
                    />
                </label>

                {/* Zone Manager */}
                <label htmlFor="zoneManager">Zone Manager <span className="text-red-500">*</span>
                    <select
                        name="zoneManager"
                        value={formData.zoneManager}
                        onChange={handleChange}
                        className="p-3 border rounded-2xl w-full"
                        required
                    >
                        <option value="">Select Zone Manager</option>
                        {(users || [])
                            .filter((user) => user.roleModel === "admin")
                            .map((user) => (
                                <option key={user._id} value={user._id}>
                                    {user.name?.firstName} {user.name?.lastName}
                                </option>
                            ))}
                    </select>
                </label>

                {/* Zone Admin Contact (auto-filled) */}
                {formData.zoneAdminContact && (
                    <label htmlFor="zoneAdminContact">Zone Admin Contact <span className="text-red-500">*</span>
                        <input
                            type="text"
                            name="zoneAdminContact"
                            value={formData.zoneAdminContact}
                            readOnly
                            className="p-3 border rounded-2xl w-full bg-gray-100"
                        />
                    </label>
                )}

                {/* Zone Admin Email (auto-filled) */}
                {formData.zoneAdminEmail && (
                    <label htmlFor="zoneAdminEmail">Zone Admin Email <span className="text-red-500">*</span>
                        <input
                            type="email"
                            name="zoneAdminEmail"
                            value={formData.zoneAdminEmail}
                            readOnly
                            className="p-3 border rounded-2xl w-full bg-gray-100"
                        />
                    </label>
                )}

                {/* City Multi-Select */}
                <label htmlFor="city">Cities <span className="text-red-500">*</span>
                    <Select
                        isMulti
                        name="city"
                        options={cityOptions}
                        value={cityOptions.filter((opt) =>
                            formData.cities.includes(opt.value)
                        )}
                        onChange={handleCityChange}
                        className="p-1 border rounded-2xl w-full"
                        placeholder="Select Cities"
                    />
                </label>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-between mt-6">
                <button
                    onClick={handleCancel}
                    className="bg-white flex items-center gap-2 border px-4 py-2 rounded-2xl text-black hover:bg-gray-200"
                >
                    <MdCancel />
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
                        onClick={handleSaveZone}
                        disabled={loading}
                        className="flex items-center gap-2 bg-black text-white px-6 py-2 rounded-2xl hover:bg-gray-900"
                    >
                        <FaSave />
                        {loading ? "Saving..." : "Save Zone"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddZone;
