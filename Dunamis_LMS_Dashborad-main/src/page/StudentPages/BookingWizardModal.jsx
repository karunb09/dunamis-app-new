import React from "react";
import PropTypes from "prop-types";

// Dummy data (API-ready)
const branches = [
  { id: "b1", name: "Downtown Center" },
  { id: "b2", name: "North Campus" },
  { id: "b3", name: "East Side Branch" },
];

const demoSlots = [
  {
    date: "Thursday, August 28",
    slots: ["10:00 AM - 10:20 AM", "1:00 PM - 1:20 PM", "8:30 PM - 8:50 PM"],
  },
  {
    date: "Friday, August 29",
    slots: ["10:00 AM - 10:20 AM", "1:00 PM - 1:20 PM", "8:30 PM - 8:50 PM"],
  },
];

const FIELD_CONTAINER =
  "w-full flex flex-col gap-6 bg-white justify-center";

export default function BookingWizardModal({
  open,
  onClose,
  selectedBranch,
  setSelectedBranch,
  selectedSlot,
  setSelectedSlot,
  handleBooking,
}) {
  if (!open) return null;

  return (
    <div
      id="book-bg"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
      style={{ minHeight: "100vh" }}
      onClick={(e) => e.target.id === "book-bg" && onClose()}
    >
      <div
        className={`
          relative w-full
          max-w-xs sm:max-w-md md:max-w-lg lg:max-w-2xl
          mx-auto
          rounded-2xl shadow-2xl
          px-2 sm:px-4 md:px-8
          py-3 sm:py-5 md:py-8
          bg-white flex flex-col items-center
          transition-all
          min-h-[auto]
          max-h-[95vh]
          overflow-y-auto
        `}
        style={{
          minHeight: "auto",
        }}
      >
        {/* Close button */}
        <button
          id="book-x"
          aria-label="Close modal"
          className="absolute right-2 top-2 sm:right-5 sm:top-5 text-2xl sm:text-3xl text-gray-400 hover:text-red-500"
          onClick={onClose}
        >
          &times;
        </button>

        {/* Heading */}
        <h2 className="mb-2 text-lg sm:text-2xl md:text-3xl font-extrabold text-center text-gray-900">
          Book Your Free Demo
        </h2>
        <p className="mb-6 text-center text-gray-600 text-xs sm:text-base">
          Choose a convenient slot and branch for your free demo session
        </p>

        {/* Booking Form */}
        <form
          onSubmit={handleBooking}
          className={`${FIELD_CONTAINER} items-center w-full`}
          autoComplete="off"
        >
          {/* Branch selection */}
          <div className="w-full mb-3">
            <label
              className="flex items-center gap-2 font-semibold mb-2 text-gray-700 text-xs sm:text-base"
              htmlFor="branch"
            >
              <span className="material-symbols-outlined text-base align-bottom">
                location_on
              </span>
              Select Branch
            </label>
            <select
              id="branch"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              required
              className="
                w-full
                rounded-lg
                px-2 py-2
                border border-gray-200
                bg-gray-100
                text-gray-900
                font-medium
                shadow-sm
                focus:ring-2 focus:ring-purple-200
                text-sm sm:text-base
              "
            >
              <option value="">Choose your branch</option>
              {branches.map(({ id, name }) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Time selection */}
          <div className="w-full">
            <label className="flex items-center gap-2 font-semibold mb-2 text-gray-700 text-xs sm:text-base">
              <span className="material-symbols-outlined text-base align-bottom">
                calendar_month
              </span>
              Select Date & Time
            </label>
            {demoSlots.map(({ date, slots }) => (
              <div
                key={date}
                className="
                  rounded-xl border border-gray-200
                  mb-4 py-2 px-1 sm:px-3
                  bg-gray-50
                "
              >
                <div className="font-semibold mb-2 text-gray-800 text-xs sm:text-base">{date}</div>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {slots.map((slot) => {
                    const isSelected =
                      selectedSlot.date === date && selectedSlot.time === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedSlot({ date, time: slot })}
                        className={`
                          px-2 py-2 sm:px-4
                          rounded-md border text-xs sm:text-base font-medium shadow-sm transition
                          ${
                            isSelected
                              ? "bg-purple-100 border-purple-400 text-purple-900"
                              : "bg-white border-gray-300 text-gray-700 hover:bg-purple-50"
                          }
                        `}
                        style={{ minWidth: 110 }}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-3 mt-6">
            <button
              type="button"
              className="rounded-md w-full sm:w-auto px-4 py-2 bg-gray-100 text-gray-700 font-medium hover:bg-gray-200"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md w-full sm:w-auto px-5 py-2 bg-purple-500 text-white font-semibold transition hover:bg-purple-600"
            >
              Book Demo Slot
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

BookingWizardModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  selectedBranch: PropTypes.string.isRequired,
  setSelectedBranch: PropTypes.func.isRequired,
  selectedSlot: PropTypes.object.isRequired,
  setSelectedSlot: PropTypes.func.isRequired,
  handleBooking: PropTypes.func.isRequired,
};
