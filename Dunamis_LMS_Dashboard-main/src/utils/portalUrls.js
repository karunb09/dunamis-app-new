export const WEBSITE_URL =
  import.meta.env.VITE_WEBSITE_URL || "http://localhost:3000";

export const STUDENT_PORTAL_URL = `${WEBSITE_URL.replace(/\/+$/, "")}/student`;
