import React from "react";
import PropTypes from "prop-types";

const FIELD_CONTAINER = "w-full flex flex-col gap-6 bg-white justify-center";

const normalizeBranch = (branch) => ({
  id: branch?._id || branch?.id || branch?.branchId || branch?.branchName,
  name:
    branch?.branchName ||
    branch?.name ||
    branch?.location ||
    branch?.address ||
    "Branch",
});

const normalizeSlot = (slot) =>
  typeof slot === "string"
    ? { value: slot, label: slot }
    : {
        value: slot?.value || slot?.time || slot?.label || "",
        label: slot?.label || slot?.time || slot?.value || "",
      };

export default function BookingWizardModal({
  open,
  onClose,
  selectedBranch,
  setSelectedBranch,
  selectedSlot,
  setSelectedSlot,
  handleBooking,
  branches = [],
  demoSlots = [],
  branchesLoading = false,
  slotsLoading = false,
}) {
  if (!open) return null;

  const branchOptions = branches.map(normalizeBranch).filter((branch) => branch.id);
  const hasBranchSelection = branchOptions.length > 0;
  const hasSlots = demoSlots.some((group) => group?.slots?.length);
  const submitDisabled =
    slotsLoading ||
    !hasSlots ||
    !selectedSlot?.time ||
    (hasBranchSelection && !selectedBranch);

  return (
    <div
      id="book-bg"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
      style={{ minHeight: "100vh" }}
      onClick={(e) => e.target.id === "book-bg" && onClose()}
    >
      <div
        className="
          relative mx-auto flex max-h-[95vh] min-h-[auto] w-full
          max-w-xs flex-col items-center overflow-y-auto rounded-2xl
          bg-white px-2 py-3 shadow-2xl transition-all
          sm:max-w-md sm:px-4 sm:py-5 md:max-w-lg md:px-8 md:py-8
          lg:max-w-2xl
        "
        style={{ minHeight: "auto" }}
      >
        <button
          id="book-x"
          aria-label="Close modal"
          className="absolute right-2 top-2 text-2xl text-gray-400 hover:text-red-500 sm:right-5 sm:top-5 sm:text-3xl"
          onClick={onClose}
        >
          &times;
        </button>

        <h2 className="mb-2 text-center text-lg font-extrabold text-gray-900 sm:text-2xl md:text-3xl">
          Book Your Free Demo
        </h2>
        <p className="mb-6 text-center text-xs text-gray-600 sm:text-base">
          Choose from the live branch and instructor availability connected to
          this course.
        </p>

        <form
          onSubmit={handleBooking}
          className={`${FIELD_CONTAINER} w-full items-center`}
          autoComplete="off"
        >
          <div className="mb-3 w-full">
            <label
              className="mb-2 flex items-center gap-2 text-xs font-semibold text-gray-700 sm:text-base"
              htmlFor="branch"
            >
              <span className="material-symbols-outlined align-bottom text-base">
                location_on
              </span>
              Branch
            </label>

            {branchesLoading ? (
              <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                Loading branches...
              </p>
            ) : hasBranchSelection ? (
              <select
                id="branch"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-200 bg-gray-100 px-2 py-2 text-sm font-medium text-gray-900 shadow-sm focus:ring-2 focus:ring-purple-200 sm:text-base"
              >
                <option value="">Choose your branch</option>
                {branchOptions.map(({ id, name }) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                No branch selection is required for this course.
              </p>
            )}
          </div>

          <div className="w-full">
            <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-gray-700 sm:text-base">
              Select Date & Time
            </label>

            {slotsLoading ? (
              <p className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-4 text-center text-sm text-gray-600">
                Loading available slots...
              </p>
            ) : !hasSlots ? (
              <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-3 py-4 text-center text-sm text-gray-600">
                No demo slots are available for this course yet.
              </p>
            ) : (
              demoSlots.map(({ date, slots }) => (
                <div
                  key={date}
                  className="mb-4 rounded-xl border border-gray-200 bg-gray-50 px-1 py-2 sm:px-3"
                >
                  <div className="mb-2 text-xs font-semibold text-gray-800 sm:text-base">
                    {date}
                  </div>
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    {slots.map((slot) => {
                      const normalizedSlot = normalizeSlot(slot);
                      const isSelected =
                        selectedSlot.date === date &&
                        selectedSlot.time === normalizedSlot.value;

                      return (
                        <button
                          key={normalizedSlot.value}
                          type="button"
                          onClick={() =>
                            setSelectedSlot({
                              date,
                              time: normalizedSlot.value,
                            })
                          }
                          className={`rounded-md border px-2 py-2 text-xs font-medium shadow-sm transition sm:px-4 sm:text-base ${
                            isSelected
                              ? "border-purple-400 bg-purple-100 text-purple-900"
                              : "border-gray-300 bg-white text-gray-700 hover:bg-purple-50"
                          }`}
                          style={{ minWidth: 110 }}
                        >
                          {normalizedSlot.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 flex w-full flex-col items-center justify-between gap-3 sm:flex-row">
            <button
              type="button"
              className="w-full rounded-md bg-gray-100 px-4 py-2 font-medium text-gray-700 hover:bg-gray-200 sm:w-auto"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitDisabled}
              className="w-full rounded-md bg-purple-500 px-5 py-2 font-semibold text-white transition hover:bg-purple-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
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
  branches: PropTypes.array,
  demoSlots: PropTypes.array,
  branchesLoading: PropTypes.bool,
  slotsLoading: PropTypes.bool,
};
