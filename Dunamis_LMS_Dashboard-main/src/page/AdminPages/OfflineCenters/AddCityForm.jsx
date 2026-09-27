import React, { useEffect, useState } from "react";
import { FaSave } from "react-icons/fa";
import { MdCancel } from "react-icons/md";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { createCity, getCityById, updateCity } from "../../../redux/City/CitySlice";
import { useStaffDirectory } from "../../../hooks/useOrg";
import { designationLabel } from "../../../constants/orgStructure";
import toast from "react-hot-toast";

const AddCityForm = () => {
    const { id } = useParams();
    const [formData, setFormData] = useState({
        cityName: "",
        cityManager: "", // Used for both City Manager and Admin
        cityAdminContact: "",
        cityAdminEmail: "",
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { data: staff = [], isLoading: staffLoading, error: staffError } = useStaffDirectory();
    const { city } = useSelector((state) => state.city);

    useEffect(() => {
        if (id) {
            dispatch(getCityById(id));
        }
    }, [dispatch, id]);

    useEffect(() => {
        if (id && city?._id === id) {
            setFormData({
                cityName: city.cityName || "",
                cityManager: city.cityManager?._id || city.cityManager || "",
                cityAdminContact: city.cityAdminContact || "",
                cityAdminEmail: city.cityAdminEmail || "",
            });
        }
    }, [city, id]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === "cityManager") {
            const selectedUser = staff.find((person) => person._id === value);

            setFormData({
                ...formData,
                cityManager: value,
                cityAdminEmail: selectedUser ? selectedUser.email : "",
                cityAdminContact: selectedUser ? selectedUser.mobileNo : "",
            });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleSaveDraft = () => {
        console.log("Draft saved:", formData);
    };

    const handleSaveCity = async () => {
        if (!formData.cityName.trim()) {
            toast.error("City name is required");
            return;
        }

        if (!formData.cityManager) {
            toast.error("City manager is required");
            return;
        }

        if (!formData.cityAdminEmail || !formData.cityAdminContact) {
            toast.error("Selected city manager must have email and contact details");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const cityData = {
                cityName: formData.cityName.trim(),
                cityManager: formData.cityManager,
                cityAdminContact: formData.cityAdminContact,
                cityAdminEmail: formData.cityAdminEmail,
            };

            if (id) {
                await dispatch(updateCity({ cityId: id, cityData })).unwrap();
                toast.success("City updated successfully!");
            } else {
                await dispatch(createCity(cityData)).unwrap();
                toast.success("City created successfully!");
            }
            navigate(-1);
        } catch (err) {
            setError(err.message || "Failed to create city");
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            cityName: "",
            cityManager: "",
            cityAdminContact: "",
            cityAdminEmail: "",
        });
        navigate(-1);
    };

    return (
        <div className="p-6 bg-gray-50 rounded-2xl">
            <h2 className="text-lg font-semibold mb-4">Create New City</h2>
            {id && <p className="mb-4 text-sm text-gray-500">Update city details</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label htmlFor="cityName">
                    City Name <span className="text-red-500">*</span>
                    <input
                        type="text"
                        name="cityName"
                        value={formData.cityName}
                        onChange={handleChange}
                        className="p-3 border rounded-2xl w-full"
                        required
                    />
                </label>

                <label htmlFor="cityManager">
                    City Manager <span className="text-red-500">*</span>
                    <select
                        name="cityManager"
                        value={formData.cityManager}
                        onChange={handleChange}
                        className="p-3 border rounded-2xl w-full"
                        required
                    >
                        <option value="">Select City Manager</option>
                        {staffLoading ? (
                            <option>Loading...</option>
                        ) : staffError ? (
                            <option>{staffError.message}</option>
                        ) : (
                            staff.map((person) => (
                                <option key={person._id} value={person._id}>
                                    {person.name?.firstName} {person.name?.lastName}
                                    {person.org?.designation ? ` · ${designationLabel(person.org.designation)}` : ""}
                                </option>
                            ))
                        )}
                    </select>
                </label>

                <label htmlFor="cityAdminContact">
                    City Admin Contact
                    <input
                        type="text"
                        name="cityAdminContact"
                        value={formData.cityAdminContact}
                        readOnly
                        className="p-3 border rounded-2xl w-full bg-gray-100 cursor-not-allowed"
                    />
                </label>

                <label htmlFor="cityAdminEmail">
                    City Admin Email
                    <input
                        type="email"
                        name="cityAdminEmail"
                        value={formData.cityAdminEmail}
                        readOnly
                        className="p-3 border rounded-2xl w-full bg-gray-100 cursor-not-allowed"
                    />
                </label>
            </div>

            <div className="flex items-center justify-between mt-6">
                <button
                    onClick={handleCancel}
                    className="bg-white flex items-center gap-2 border px-4 py-2 rounded-2xl text-black hover:bg-gray-200"
                >
                    <MdCancel /> Cancel
                </button>

                <div className="flex items-center gap-4">
                    <button
                        onClick={handleSaveDraft}
                        className="bg-white flex items-center gap-2 border px-4 py-2 rounded-2xl text-black hover:bg-gray-200"
                    >
                        Save Draft
                    </button>

                    <button
                        onClick={handleSaveCity}
                        className="flex items-center gap-2 bg-black text-white px-6 py-2 rounded-2xl hover:bg-gray-900"
                        disabled={loading}
                    >
                        {loading ? <span>Saving...</span> : <><FaSave /> {id ? "Update City" : "Save City"}</>}
                    </button>
                </div>
            </div>

            {error && <p className="text-red-500 mt-4">{error}</p>}
        </div>
    );
};

export default AddCityForm;
