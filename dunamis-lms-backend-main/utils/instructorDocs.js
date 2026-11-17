const activeDocPath = (versions) =>
  (Array.isArray(versions) ? versions : []).find((version) => version?.isActive)?.filePath || "";

module.exports = { activeDocPath };
