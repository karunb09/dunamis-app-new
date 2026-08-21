const TEACHING_LANGUAGES = [
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

const DEFAULT_TEACHING_LANGUAGES = ["English"];

const LANGUAGE_BY_KEY = new Map(
  TEACHING_LANGUAGES.map((language) => [language.toLowerCase(), language])
);

const normalizeLanguages = (input) => {
  if (!input) return [];

  const raw = Array.isArray(input) ? input : String(input).split(",");

  const seen = new Set();
  const result = [];

  for (const entry of raw) {
    const canonical = LANGUAGE_BY_KEY.get(String(entry).trim().toLowerCase());
    if (canonical && !seen.has(canonical)) {
      seen.add(canonical);
      result.push(canonical);
    }
  }

  return result;
};

module.exports = {
  TEACHING_LANGUAGES,
  DEFAULT_TEACHING_LANGUAGES,
  normalizeLanguages,
};
