import React, { useState, useEffect } from 'react';

const EditInstructorModal = ({ open, onClose, data, onSave }) => {
    const [form, setForm] = useState(data);

    useEffect(() => {
        if (open) {
            setForm(data); // Reset when modal opens
        }
    }, [open, data]);

    const handleChange = (key, value) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const handleSubmit = () => {
        onSave(form);
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-lg p-6 shadow-xl relative">
                <h2 className="text-xl font-semibold mb-4">Edit Instructor Details</h2>

                {/* Mode Dropdown */}
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Mode</label>
                    <select
                        value={form.mode}
                        onChange={(e) => handleChange('mode', e.target.value)}
                        className="w-full border rounded-2xl border-gray-300 rounded px-3 py-2"
                    >
                        <option value="Online">Online</option>
                        <option value="Offline">Offline</option>
                    </select>
                </div>

                {/* Branch - only if Offline */}
                {form.mode === 'Offline' && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">Branch</label>
                        <input
                            type="text"
                            value={form.branch}
                            onChange={(e) => handleChange('branch', e.target.value)}
                            className="rounded-2xl w-full border border-gray-300 rounded px-3 py-2"
                        />
                    </div>
                )}

                {/* Courses Input */}
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Courses (comma-separated)</label>
                    <input
                        type="text"
                        value={form.courses.join(', ')}
                        onChange={(e) =>
                            handleChange('courses', e.target.value.split(',').map(c => c.trim()))
                        }
                        className="rounded-2xl w-full border border-gray-300 rounded px-3 py-2"
                    />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-2xl bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-2 rounded-2xl bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditInstructorModal;
