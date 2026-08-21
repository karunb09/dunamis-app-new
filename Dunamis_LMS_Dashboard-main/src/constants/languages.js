export const TEACHING_LANGUAGES = [
  "English",
  "Hindi",
  "Kannada",
  "Tamil",
  "Telugu",
  "Malayalam",
  "Marathi",
  "Bengali",
  "Gujarati",
  "Punjabi",
  "Urdu",
];

export const DEFAULT_TEACHING_LANGUAGES = ["English"];

export const LANGUAGE_OPTIONS = TEACHING_LANGUAGES.map((language) => ({
  value: language,
  label: language,
}));

export const LANGUAGE_SELECT_STYLES = {
  control: (base, state) => ({
    ...base,
    minHeight: 48,
    borderRadius: 16,
    borderColor: state.isFocused ? "#fb923c" : "#e5e7eb",
    boxShadow: state.isFocused ? "0 0 0 2px #ffedd5" : "none",
    "&:hover": { borderColor: "#fb923c" },
  }),
  multiValue: (base) => ({
    ...base,
    borderRadius: 999,
    backgroundColor: "#fff7ed",
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: "#c2410c",
    fontWeight: 500,
  }),
};

export const toLanguageOptions = (values) =>
  (Array.isArray(values) ? values : [])
    .map((value) => LANGUAGE_OPTIONS.find((option) => option.value === value))
    .filter(Boolean);
