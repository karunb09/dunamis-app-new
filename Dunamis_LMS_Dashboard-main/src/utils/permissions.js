// The one permission check for the dashboard. Mirrors the server
// (middleware/auth.js → requirePermission): superadmins and All Access see
// everything; otherwise one of the keys must be granted. An empty permission
// list grants nothing.
export const hasFullAccess = (user) =>
  user?.accountType === "superadmin" || (user?.permissions || []).includes("allAccess");

export const hasPermission = (user, ...keys) =>
  hasFullAccess(user) || keys.some((key) => (user?.permissions || []).includes(key));
