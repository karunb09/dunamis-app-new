// Step-progress header for the EnrollTerms wizard. Leaf component — pure
// presentation, no wizard state beyond the current step + setter.

// Spelled out so Tailwind keeps both classes — an interpolated name is purged.
const COLUMN_CLASS = { 4: 'sm:grid-cols-4', 5: 'sm:grid-cols-5' };

export default function StepNav({ steps, step, setStep }) {
  return (
    <div className={`mt-6 grid gap-3 ${COLUMN_CLASS[steps.length] || 'sm:grid-cols-5'}`}>
      {steps.map(({ id, label }, index) => {
        const active = step === index;
        const completed = step > index;

        return (
          <button
            key={id}
            type="button"
            disabled={index > step}
            onClick={() => setStep(index)}
            className={`rounded-2xl border px-3 py-3 text-left text-xs transition ${
              active
                ? 'border-orange-500 bg-orange-50 text-orange-700'
                : completed
                  ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                  : 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
            }`}
          >
            <p className="font-semibold">{label}</p>
          </button>
        );
      })}
    </div>
  );
}
