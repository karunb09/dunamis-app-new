import { State, City, Country } from "country-state-city";
import { useState } from "react";

export default function Step2Contact({ formData, setFormData }) {
    const [selectedState, setSelectedState] = useState(formData.currentState || "");
    const [selectedCity, setSelectedCity] = useState(formData.currentCity || "");
    const [selectedCountry, setSelectedCountry] = useState(formData.country || "IN"); 

    return (
        <div className="space-y-4">
            {/* Email & Mobile */}
            <div className="flex flex-col md:flex-row gap-4">
                <input
                    type="email"
                    placeholder="Enter your email address"
                    className="flex-1 p-3 rounded-2xl border border-gray-300"
                    value={formData.email}
                    onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                    }
                />

                <input
                    type="text"
                    placeholder="Enter your mobile number"
                    className="flex-1 p-3 rounded-2xl border border-gray-300"
                    value={formData.mobileNo}
                    onChange={(e) =>
                        setFormData({ ...formData, mobileNo: e.target.value })
                    }
                />
            </div>

            {/* Address Line 1 */}
            <input
                type="text"
                placeholder="Enter your address line 1"
                className="w-full p-3 rounded-2xl border border-gray-300"
                value={formData.addressLine1}
                onChange={(e) =>
                    setFormData({ ...formData, addressLine1: e.target.value })
                }
            />

            {/* City & State */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select
                    className="w-full p-3 rounded-2xl border border-gray-300"
                    value={selectedCity}
                    onChange={(e) => {
                        setSelectedCity(e.target.value);
                        setFormData({ ...formData, currentCity: e.target.value });
                    }}
                    disabled={!selectedState}
                >
                    <option value="">Select City</option>
                    {City.getCitiesOfState(selectedCountry, selectedState).map((city) => (
                        <option key={city.name} value={city.name}>
                            {city.name}
                        </option>
                    ))}
                </select>

                <select
                    className="w-full p-3 rounded-2xl border border-gray-300"
                    value={selectedState}
                    onChange={(e) => {
                        setSelectedState(e.target.value);
                        setSelectedCity("");
                        setFormData({
                            ...formData,
                            currentState: e.target.value,
                            currentCity: "",
                        });
                    }}
                >
                    <option value="">Select State</option>
                    {State.getStatesOfCountry(selectedCountry).map((state) => (
                        <option key={state.isoCode} value={state.isoCode}>
                            {state.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Country & Zipcode */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select
                    className="w-full p-3 rounded-2xl border border-gray-300"
                    value={selectedCountry}
                    onChange={(e) => {
                        setSelectedCountry(e.target.value);
                        setSelectedState("");
                        setSelectedCity("");
                        setFormData({
                            ...formData,
                            country: e.target.value,
                            currentState: "",
                            currentCity: "",
                        });
                    }}
                >
                    <option value="">Select Country</option>
                    {Country.getAllCountries().map((country) => (
                        <option key={country.isoCode} value={country.isoCode}>
                            {country.name}
                        </option>
                    ))}
                </select>

                <input
                    type="text"
                    placeholder="Enter your pincode/zipcode"
                    className="w-full p-3 rounded-2xl border border-gray-300"
                    value={formData.zipcode}
                    onChange={(e) =>
                        setFormData({ ...formData, zipcode: e.target.value })
                    }
                />
            </div>

            {/* Optional: Full Address textarea */}
            <textarea
                placeholder="Enter additional address details"
                className="w-full p-3 rounded-2xl border border-gray-300"
                rows={3}
                value={formData.currentAddress}
                onChange={(e) =>
                    setFormData({ ...formData, currentAddress: e.target.value })
                }
            />
        </div>
    );
}
