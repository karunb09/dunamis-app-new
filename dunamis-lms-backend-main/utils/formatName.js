// User.name is a { firstName, lastName } subdocument everywhere.
const formatUserName = (name, fallback = "Unknown") =>
  [name?.firstName, name?.lastName].filter(Boolean).join(" ") || fallback;

module.exports = { formatUserName };
