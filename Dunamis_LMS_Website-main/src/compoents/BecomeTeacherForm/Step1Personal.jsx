export default function Step1Personal({ formData, setFormData }) {
    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
                <input
                    type="text"
                    placeholder="Enter your first name"
                    className="flex-1 p-3 rounded-2xl border border-gray-300"
                    value={formData.firstName}
                    onChange={(e) =>
                        setFormData({ ...formData, firstName: e.target.value })
                    }
                />
                <input
                    type="text"
                    placeholder="Enter your last name"
                    className="flex-1 p-3 rounded-2xl border border-gray-300"
                    value={formData.lastName}
                    onChange={(e) =>
                        setFormData({ ...formData, lastName: e.target.value })
                    }
                />
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <select
                    className="flex-1 p-3 rounded-2xl border border-gray-300"
                    value={formData.gender}
                    onChange={(e) =>
                        setFormData({ ...formData, gender: e.target.value })
                    }
                >
                    <option value="" disabled>Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                </select>

                <input
                    type="date"
                    className="flex-1 p-3 rounded-2xl border border-gray-300"
                    value={formData.dob}
                    onChange={(e) =>
                        setFormData({ ...formData, dob: e.target.value })
                    }
                />
            </div>

            <input
                type="text"
                placeholder="Languages you can read (comma separated)"
                className="w-full p-3 rounded-2xl border border-gray-300"
                value={formData.readLanguage}
                onChange={(e) =>
                    setFormData({ ...formData, readLanguage: e.target.value })
                }
            />

            <input
                type="text"
                placeholder="Languages you can speak (comma separated)"
                className="w-full p-3 rounded-2xl border border-gray-300"
                value={formData.speakLanguage}
                onChange={(e) =>
                    setFormData({ ...formData, speakLanguage: e.target.value })
                }
            />
        </div>
    );
}
