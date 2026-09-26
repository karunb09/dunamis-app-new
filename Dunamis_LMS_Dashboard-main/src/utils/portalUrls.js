export const WEBSITE_URL =
  import.meta.env.VITE_WEBSITE_URL || "http://localhost:3000";

export const STUDENT_PORTAL_URL = `${WEBSITE_URL.replace(/\/+$/, "")}/student`;

export const getDefaultRoute = (accountType) => {
  switch (accountType) {
    case "admin":
    case "superadmin":
      return "/admin";
    case "teacher":
      return "/teacher";
    case "student":
      return "/home";
    default:
      return "/";
  }
};
