import React, { useEffect, useState } from "react";
import { FaSave } from "react-icons/fa";
import { MdCancel } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { createCity } from "../../../redux/City/CitySlice";
import { getAllUsers } from "../../../redux/User/UserSlice";

const AddCityForm = () => {
    const [formData, setFormData] = useState({
        cityName: "",
        location: "",
        cityManager: "", // Used for both City Manager and Admin
        cityAdminContact: "",
        cityAdminEmail: "",
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const {
        users,
        loading: usersLoading,
        error: usersError,
    } = useSelector((state) => state.user);

    // Replace with actual token from auth state/context
    const token = "yourAuthToken";

    useEffect(() => {
        if (!users.length && token) {
            dispatch(getAllUsers(token));
        }
    }, [dispatch, users.length, token]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === "cityManager") {
            const selectedUser = users.find(user => user._id === value);

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
        setLoading(true);
        setError(null);

        try {
            const newCity = {
                cityName: formData.cityName,
                location: formData.location,
                cityManager: formData.cityManager,
                cityAdminContact: formData.cityAdminContact,
                cityAdminEmail: formData.cityAdminEmail,
            };

            await dispatch(createCity(newCity)).unwrap();
            navigate("/admin/centers");
        } catch (err) {
            setError(err.message || "Failed to create city");
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            cityName: "",
            location: "",
            cityManager: "",
            cityAdminContact: "",
            cityAdminEmail: "",
        });
        navigate("/admin/centers");
    };

    return (
        <div className="p-6 bg-gray-50 rounded-2xl">
            <h2 className="text-lg font-semibold mb-4">Create New City</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label htmlFor="cityName">
                    City Name
                    <input
                        type="text"
                        name="cityName"
                        value={formData.cityName}
                        onChange={handleChange}
                        className="p-3 border rounded-2xl w-full"
                    />
                </label>

                <label htmlFor="location">
                    Location
                    <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        className="p-3 border rounded-2xl w-full"
                    />
                </label>

                <label htmlFor="cityManager">
                    City Manager
                    <select
                        name="cityManager"
                        value={formData.cityManager}
                        onChange={handleChange}
                        className="p-3 border rounded-2xl w-full"
                    >
                        <option value="">Select City Manager</option>
                        {usersLoading ? (
                            <option>Loading...</option>
                        ) : usersError ? (
                            <option>{usersError}</option>
                        ) : (
                            users
                                .filter((user) => user.roleModel === "admin")
                                .map((user) => (
                                    <option key={user._id} value={user._id}>
                                        {user.name.firstName} {user.name.lastName}
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
                        {loading ? <span>Saving...</span> : <><FaSave /> Save City</>}
                    </button>
                </div>
            </div>

            {error && <p className="text-red-500 mt-4">{error}</p>}
        </div>
    );
};

export default AddCityForm;
