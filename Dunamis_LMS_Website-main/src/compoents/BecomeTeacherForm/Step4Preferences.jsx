export default function Step4Preferences({ formData, setFormData }) {
    // Function to allow only numbers and commas
    const handleCTCChange = (field, value) => {
        const formatted = value.replace(/[^0-9,]/g, ""); // allow only numbers & commas
        setFormData({ ...formData, [field]: formatted });
    };

    return (
        <div className="space-y-4">
            {/* CTC Fields */}
            <div className="flex flex-col md:flex-row gap-4">
                <input
                    type="text"
                    placeholder="Current CTC (in INR)"
                    className="flex-1 p-3 rounded-2xl border border-gray-300"
                    value={formData.currentCTC}
                    onChange={(e) => handleCTCChange("currentCTC", e.target.value)}
                />
                <input
                    type="text"
                    placeholder="Expected CTC (in INR)"
                    className="flex-1 p-3 rounded-2xl border border-gray-300"
                    value={formData.expectedCTC}
                    onChange={(e) => handleCTCChange("expectedCTC", e.target.value)}
                />
            </div>

            {/* Notice Period */}
            <select
                className="w-full p-3 rounded-2xl border border-gray-300"
                value={formData.noticePeriod}
                onChange={(e) =>
                    setFormData({ ...formData, noticePeriod: e.target.value })
                }
            >
                <option value="" disabled>Notice Period</option>
                <option value="15 days">15 Days</option>
                <option value="1 month">1 Month</option>
                <option value="2 month">2 Months</option>
                <option value="3 month">3 Months</option>
            </select>

            {/* Mode of Teaching */}
            <select
                className="w-full p-3 rounded-2xl border border-gray-300"
                value={formData.mode}
                onChange={(e) =>
                    setFormData({ ...formData, mode: e.target.value })
                }
            >
                <option value="" disabled>Mode of Teaching</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="both">Both Online & Offline</option>
            </select>

            {/* Availability */}
            <div className="w-full p-3 rounded-2xl border border-gray-300">
                <label className="block text-sm font-medium text-gray-700 mb-2">Availability</label>

                {["Weekends Only", "Week Days", "Flexible"].map((opt) => (
                    <label className="block mt-2" key={opt}>
                        <input
                            type="checkbox"
                            value={opt}
                            checked={formData.availability?.includes(opt)}
                            onChange={(e) => {
                                const { checked, value } = e.target;
                                const updated = checked
                                    ? [...(formData.availability || []), value]
                                    : formData.availability.filter((v) => v !== value);
                                setFormData({ ...formData, availability: updated });
                            }}
                        />
                        <span className="ml-2">{opt}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}
