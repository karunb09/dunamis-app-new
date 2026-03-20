export const normalizeEntityId = (value) => {
  if (!value && value !== 0) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }

  return String(
    value?._id || value?.id || value?.roleId || value?.userId || ""
  ).trim();
};

export const getTeacherRoleId = (user) =>
  normalizeEntityId(user?.roleId || user?._id || "");

export const getUserDisplayName = (user, fallback = "User") => {
  if (typeof user?.name === "string" && user.name.trim()) {
    return user.name.trim();
  }

  const firstName = user?.name?.firstName || "";
  const lastName = user?.name?.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || user?.fullName || fallback;
};
