import {
  FieldError,
  FieldGroup,
  FieldLabel,
  SelectInput,
  TextInput,
  baseInputClassName,
} from "./FormFields";

export default function Step4Preferences({ formData, setFormData, errors = {} }) {
  const handleCTCChange = (field, value) => {
    const formatted = value.replace(/[^0-9,]/g, "");
    setFormData({ ...formData, [field]: formatted });
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <TextInput
          id="teacher-current-ctc"
          label="Current CTC"
          placeholder="Current CTC in INR"
          value={formData.currentCTC}
          onChange={(e) => handleCTCChange("currentCTC", e.target.value)}
          error={errors.currentCTC}
          required
        />

        <TextInput
          id="teacher-expected-ctc"
          label="Expected CTC"
          placeholder="Expected CTC in INR"
          value={formData.expectedCTC}
          onChange={(e) => handleCTCChange("expectedCTC", e.target.value)}
          error={errors.expectedCTC}
          required
        />

        <SelectInput
          id="teacher-notice-period"
          label="Notice Period"
          value={formData.noticePeriod}
          onChange={(e) =>
            setFormData({ ...formData, noticePeriod: e.target.value })
          }
          error={errors.noticePeriod}
          required
        >
          <option value="">Select notice period</option>
          <option value="15 days">15 Days</option>
          <option value="1 month">1 Month</option>
          <option value="2 month">2 Months</option>
          <option value="3 month">3 Months</option>
        </SelectInput>

        <SelectInput
          id="teacher-mode"
          label="Teaching Mode"
          value={formData.mode}
          onChange={(e) =>
            setFormData({ ...formData, mode: e.target.value })
          }
          error={errors.mode}
          required
        >
          <option value="">Select teaching mode</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
        </SelectInput>
      </div>

      <FieldGroup>
        <FieldLabel required htmlFor="teacher-availability">
          Availability
        </FieldLabel>
        <div
          id="teacher-availability"
          className={`${baseInputClassName} space-y-3 rounded-2xl`}
        >
          {["Flexible", "Week Days", "Weekends Only"].map((option) => (
            <label
              key={option}
              className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2 hover:bg-orange-50"
            >
              <input
                type="radio"
                name="availability"
                value={option}
                checked={formData.availability === option}
                onChange={(e) =>
                  setFormData({ ...formData, availability: e.target.value })
                }
                className="accent-orange-500"
              />
              <span className="text-sm text-gray-700">{option}</span>
            </label>
          ))}
        </div>
        <FieldError error={errors.availability} />
      </FieldGroup>
    </div>
  );
}
