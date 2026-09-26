const EMAIL_PATTERN = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;
const NUMBER_PATTERN = /\+?\d[\d\s-]{4,}\d/g;

// Visitors type phone numbers and emails into chat boxes; neither is stored.
const redact = (value) =>
  String(value || "")
    .replace(EMAIL_PATTERN, "[email]")
    .replace(NUMBER_PATTERN, (match) => (match.replace(/\D/g, "").length >= 6 ? "[number]" : match));

const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s[\]]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

module.exports = { redact, normalize };
