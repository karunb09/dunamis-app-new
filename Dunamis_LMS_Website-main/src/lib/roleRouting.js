import { DASHBOARD_URL } from "@/lib/siteConfig";

export const LOGIN_PORTALS = [
  {
    id: "student",
    label: "Student",
    description: "Courses, payments, assignments, and your learning area.",
  },
  {
    id: "teacher",
    label: "Instructor",
    description: "Teaching workspace, schedules, learners, and assignments.",
  },
  {
    id: "admin",
    label: "Admin",
    description: "Operations, course management, content, and finance tools.",
  },
];

export const normalizeAccountType = (accountType) =>
  String(accountType || "").trim().toLowerCase();

export const getPortalForAccountType = (accountType) => {
  const normalized = normalizeAccountType(accountType);

  if (normalized === "student") return "student";
  if (normalized === "teacher" || normalized === "instructor") return "teacher";
  if (normalized === "admin" || normalized === "superadmin") return "admin";

  return "";
};

export const getPortalLabel = (portalId) =>
  LOGIN_PORTALS.find((portal) => portal.id === portalId)?.label || "account";

export const isStudentAccount = (account) =>
  getPortalForAccountType(account?.accountType) === "student";

export const getRoleDestination = (accountType) => {
  const portal = getPortalForAccountType(accountType);

  if (portal === "student") return "/student";
  if (portal === "teacher" || portal === "admin") return DASHBOARD_URL;

  return "/";
};

export const navigateToRoleDestination = (router, href) => {
  if (!href) return;

  if (/^https?:\/\//i.test(href)) {
    window.location.href = href;
    return;
  }

  router.replace(href);
};
