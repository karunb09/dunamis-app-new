import { HiOutlineLocationMarker } from 'react-icons/hi';

// EnrollTerms step 0 — delivery mode + (offline) branch selection.
export default function StepDelivery({
  enrollmentModeOptions,
  selectedDeliveryMode,
  setSelectedDeliveryMode,
  setSelectedInstructorId,
  setSelectedSlotId,
  setSelectedBranchId,
  shouldPickBranch,
  branchCityOptions,
  selectedBranchCity,
  setSelectedBranchCity,
  filteredBranchOptions,
  selectedBranchId,
}) {
  return (
    <div className="mt-7 space-y-6">
      {enrollmentModeOptions.length > 1 ? (
        <div>
          <label className="mb-3 block text-sm font-medium text-gray-700">
            Select Delivery Mode
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            {enrollmentModeOptions.map((mode) => {
              const active = selectedDeliveryMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setSelectedDeliveryMode(mode);
                    setSelectedInstructorId('');
                    setSelectedSlotId('');
                    if (mode !== 'offline') setSelectedBranchId('');
                  }}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    active
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-orange-200 hover:bg-gray-50'
                  }`}
                >
                  <p className="font-semibold capitalize text-gray-900">
                    {mode}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {mode === 'offline'
                      ? 'Attend at the selected branch.'
                      : 'Attend the session online.'}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-orange-700">
          Delivery mode:{' '}
          <span className="font-semibold capitalize">
            {selectedDeliveryMode}
          </span>
        </div>
      )}

      {shouldPickBranch ? (
        <div>
          {branchCityOptions.length > 0 ? (
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Filter by city
              </label>
              <select
                value={selectedBranchCity}
                onChange={(event) => {
                  setSelectedBranchCity(event.target.value);
                  setSelectedBranchId('');
                  setSelectedInstructorId('');
                  setSelectedSlotId('');
                }}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
              >
                <option value="all">All cities</option>
                {branchCityOptions.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
            <HiOutlineLocationMarker />
            Select Branch
          </label>
          <select
            value={selectedBranchId}
            onChange={(event) => {
              setSelectedBranchId(event.target.value);
              setSelectedInstructorId('');
              setSelectedSlotId('');
            }}
            className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
          >
            <option value="">Choose a branch</option>
            {filteredBranchOptions.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.city ? `${branch.label} - ${branch.city}` : branch.label}
              </option>
            ))}
          </select>
          {filteredBranchOptions.length === 0 ? (
            <p className="mt-2 text-xs text-gray-500">
              No branches found for this city. Choose another city to continue.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
