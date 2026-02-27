import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";

const Availability = ({ user }) => {
    const [availabilitySlots, setAvailabilitySlots] = useState({});
    const [showSlotModal, setShowSlotModal] = useState(false);
    const [editingSlot, setEditingSlot] = useState(null);
    const [newSlot, setNewSlot] = useState({
        days: [],
        startTime: "10:00",
        endTime: "12:00",
        sessionType: "standard",
        slotType: "demo",
        maxStudents: 4,
    });
    const [selectedDayGroup, setSelectedDayGroup] = useState("");

    const convertTo12Hour = (time24) => {
        if (!time24) return "";
        if (time24.includes("AM") || time24.includes("PM")) return time24;
        const [hours, minutes] = time24.split(":");
        const hour = parseInt(hours, 10);
        const period = hour >= 12 ? "PM" : "AM";
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${period}`;
    };

    const groupSlotsByDays = (slots) => {
        const grouped = {};
        slots.forEach((slot) => {
            let key;
            if (slot.days && slot.days.length > 0) {
                key = [...slot.days]
                    .sort()
                    .map((day) => day.charAt(0).toUpperCase() + day.slice(1))
                    .join(" & ");
            } else if (slot.day) {
                key = slot.day.charAt(0).toUpperCase() + slot.day.slice(1);
            } else {
                key = "Other Slots";
            }
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push({
                ...slot,
                displayTime: `${convertTo12Hour(slot.startTime)} - ${convertTo12Hour(
                    slot.endTime
                )}`,
                displayDays:
                    (slot.days?.join(", ") || slot.day || "").toUpperCase(),
                isActive: ["enrolled", "demo"].includes(slot.slotType),
            });
        });
        return grouped;
    };

    useEffect(() => {
        if (user?.roleId?.weeklyAvailability?.length > 0) {
            setAvailabilitySlots(groupSlotsByDays(user.roleId.weeklyAvailability));
        }
    }, [user]);

    const handleDayToggle = (day) => {
        setNewSlot((prev) => ({
            ...prev,
            days: prev.days.includes(day)
                ? prev.days.filter((d) => d !== day)
                : [...prev.days, day],
        }));
    };

    const toggleSlotStatus = (dayGroup, slotId) => {
        setAvailabilitySlots((prev) => ({
            ...prev,
            [dayGroup]: prev[dayGroup].map((slot) =>
                slot._id === slotId ? { ...slot, isActive: !slot.isActive } : slot
            ),
        }));
    };

    const openAddSlotModal = (dayGroup) => {
        setSelectedDayGroup(dayGroup);
        setEditingSlot(null);
        setNewSlot({
            days: [],
            startTime: "10:00",
            endTime: "12:00",
            sessionType: "standard",
            slotType: "demo",
            maxStudents: 4,
        });
        setShowSlotModal(true);
    };

    const openEditSlotModal = (dayGroup, slot) => {
        setSelectedDayGroup(dayGroup);
        setEditingSlot(slot);
        setNewSlot({
            days: slot.days || [],
            startTime: slot.startTime,
            endTime: slot.endTime,
            sessionType: slot.sessionType,
            slotType: slot.slotType,
            maxStudents: slot.maxStudents,
        });
        setShowSlotModal(true);
    };

    const handleAddSlot = () => {
        if (newSlot.days.length > 0 && newSlot.startTime && newSlot.endTime) {
            const slot = {
                ...newSlot,
                _id: Date.now().toString(),
                displayTime: `${convertTo12Hour(
                    newSlot.startTime
                )} - ${convertTo12Hour(newSlot.endTime)}`,
                displayDays: newSlot.days.join(", ").toUpperCase(),
                isActive: true,
            };

            setAvailabilitySlots((prev) => ({
                ...prev,
                [selectedDayGroup]: [...(prev[selectedDayGroup] || []), slot],
            }));

            setShowSlotModal(false);
            toast.success("Slot added successfully!");
        } else {
            toast.error("Please fill all required fields");
        }
    };

    const handleUpdateSlot = () => {
        if (
            newSlot.days.length > 0 &&
            newSlot.startTime &&
            newSlot.endTime &&
            editingSlot
        ) {
            setAvailabilitySlots((prev) => ({
                ...prev,
                [selectedDayGroup]: prev[selectedDayGroup].map((slot) =>
                    slot._id === editingSlot._id
                        ? {
                            ...slot,
                            ...newSlot,
                            displayTime: `${convertTo12Hour(
                                newSlot.startTime
                            )} - ${convertTo12Hour(newSlot.endTime)}`,
                            displayDays: newSlot.days.join(", ").toUpperCase(),
                        }
                        : slot
                ),
            }));
            setShowSlotModal(false);
            toast.success("Slot updated successfully!");
        } else {
            toast.error("Please fill all required fields");
        }
    };

    const handleDeleteSlot = (dayGroup, slotId) => {
        setAvailabilitySlots((prev) => ({
            ...prev,
            [dayGroup]: prev[dayGroup].filter((slot) => slot._id !== slotId),
        }));
        toast.success("Slot deleted successfully!");
    };

    const handleSaveAvailability = () => {
        console.log("Saving availability slots:", availabilitySlots);
        toast.success("Availability slots saved successfully!");
    };

    return (
        <div>
            <h2 className="text-xl font-semibold mb-2">Availability</h2>
            <p className="text-gray-600 mb-6">
                Pick and manage your available time slots so students can easily book
                sessions with you.
            </p>

            {Object.keys(availabilitySlots).length > 0 ? (
                Object.entries(availabilitySlots).map(([dayGroup, slots]) => (
                    <div key={dayGroup} className="mb-6">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-lg font-medium text-purple-600">
                                {dayGroup}
                            </h3>
                            <button
                                onClick={() => openAddSlotModal(dayGroup)}
                                className="px-3 py-1 text-sm border border-black text-black rounded-lg hover:bg-gray-50"
                            >
                                + Add slots
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {slots.map((slot) => (
                                <div
                                    key={slot._id}
                                    className={`px-3 py-2 rounded-lg border cursor-pointer transition-colors ${slot.isActive
                                            ? "bg-white border-black text-black hover:bg-gray-100"
                                            : "bg-gray-100 border-gray-300 text-gray-500 hover:bg-gray-200"
                                        }`}
                                    onClick={() => toggleSlotStatus(dayGroup, slot._id)}
                                >
                                    <div className="text-sm font-medium">{slot.displayTime}</div>
                                    <div className="text-xs text-gray-500">{slot.displayDays}</div>
                                    <div className="flex items-center gap-1 mt-1">
                                        <span
                                            className={`text-xs px-2 py-0.5 rounded ${slot.sessionType === "premium"
                                                    ? "bg-purple-100 text-purple-700"
                                                    : "bg-blue-100 text-blue-700"
                                                }`}
                                        >
                                            {slot.sessionType}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            ({slot.maxStudents} max)
                                        </span>
                                    </div>
                                    <div className="flex gap-1 mt-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openEditSlotModal(dayGroup, slot);
                                            }}
                                            className="text-xs px-4 py-1 bg-white text-gray-500 rounded hover:text-black"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteSlot(dayGroup, slot._id);
                                            }}
                                            className="text-xs px-2 py-1 text-gray-500 rounded hover:text-black"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center py-12">
                    <p className="text-gray-500">
                        No availability slots found. Add your first slot to get started!
                    </p>
                </div>
            )}
            <div className="flex justify-end gap-3 mt-8">
                <button className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                    Cancel
                </button>
                <button
                    onClick={handleSaveAvailability}
                    className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
                >
                    Save
                </button>
            </div>

            {showSlotModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg">
                        <h3 className="text-lg font-semibold mb-4">
                            {editingSlot ? "Edit Slot" : "Add New Slot"}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-600 mb-2">Days</label>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        "monday",
                                        "tuesday",
                                        "wednesday",
                                        "thursday",
                                        "friday",
                                        "saturday",
                                        "sunday",
                                    ].map((day) => (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => handleDayToggle(day)}
                                            className={`px-3 py-1 rounded-lg text-sm ${newSlot.days.includes(day)
                                                    ? "bg-black text-white"
                                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                }`}
                                        >
                                            {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">
                                        Start Time
                                    </label>
                                    <input
                                        type="time"
                                        className="w-full border rounded-lg px-3 py-2"
                                        value={newSlot.startTime}
                                        onChange={(e) =>
                                            setNewSlot({ ...newSlot, startTime: e.target.value })
                                        }
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">
                                        End Time
                                    </label>
                                    <input
                                        type="time"
                                        className="w-full border rounded-lg px-3 py-2"
                                        value={newSlot.endTime}
                                        onChange={(e) =>
                                            setNewSlot({ ...newSlot, endTime: e.target.value })
                                        }
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">
                                    Session Type
                                </label>
                                <select
                                    className="w-full border rounded-lg px-3 py-2"
                                    value={newSlot.sessionType}
                                    onChange={(e) =>
                                        setNewSlot({ ...newSlot, sessionType: e.target.value })
                                    }
                                >
                                    <option value="standard">Standard</option>
                                    <option value="premium">Premium</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">
                                    Slot Type
                                </label>
                                <select
                                    className="w-full border rounded-lg px-3 py-2"
                                    value={newSlot.slotType}
                                    onChange={(e) =>
                                        setNewSlot({ ...newSlot, slotType: e.target.value })
                                    }
                                >
                                    <option value="demo">Demo</option>
                                    <option value="enrolled">Enrolled</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">
                                    Max Students
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    className="w-full border rounded-lg px-3 py-2"
                                    value={newSlot.maxStudents}
                                    onChange={(e) =>
                                        setNewSlot({
                                            ...newSlot,
                                            maxStudents: parseInt(e.target.value),
                                        })
                                    }
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowSlotModal(false);
                                    setEditingSlot(null);
                                    setNewSlot({
                                        days: [],
                                        startTime: "10:00",
                                        endTime: "12:00",
                                        sessionType: "standard",
                                        slotType: "demo",
                                        maxStudents: 4,
                                    });
                                }}
                                className="px-4 py-2 border rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={editingSlot ? handleUpdateSlot : handleAddSlot}
                                className="px-4 py-2 bg-black text-white rounded-lg"
                            >
                                {editingSlot ? "Update" : "Add"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Availability;
