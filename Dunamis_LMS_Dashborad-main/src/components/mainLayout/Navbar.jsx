import React from "react";
import { FiMenu, FiBell, FiSettings, FiArrowLeft } from "react-icons/fi";
import { useLocation, useNavigate } from "react-router-dom";
import { getStoredUser } from "../../utils/authSession";

const IMAGE = import.meta.env.VITE_IMAGE;

const Navigation = ({ onMenuClick }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const user = getStoredUser() || {};
  const fullName = `${user?.name?.firstName || "User"} ${user?.name?.lastName || ""}`.trim();
  const accountType = user?.accountType || "guest";

  const profileImage = user?.image
    ? user.image.startsWith("http")
      ? user.image
      : `${IMAGE}${user.image}`
    : "https://i.pravatar.cc/300";

  const generateTitle = (path) => {
    const cleanPath = path.replace(/^\/|\/$/g, "").split("/");

    const rolePrefixes = ["admin", "teacher", "student"];
    const filteredPath = cleanPath.filter((segment, index) => {
      if (index === 0 && rolePrefixes.includes(segment.toLowerCase())) {
        return false;
      }

      if (/^[0-9a-f]{24}$/i.test(segment)) {
        return false;
      }

      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
        return false;
      }

      if (/^\d+$/.test(segment)) {
        return false;
      }

      return true;
    });

    const capitalizedTitle = filteredPath
      .map((segment) =>
        segment
          .replace(/-/g, " ")
          .replace(/_/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase())
      )
      .join(" ");

    return capitalizedTitle || "Dashboard";
  };

  const title = generateTitle(location.pathname);
  const roleLabel =
    accountType === "superadmin"
      ? "Super Admin"
      : accountType === "admin"
        ? "Admin Workspace"
        : accountType === "teacher"
          ? "Teacher Workspace"
          : accountType === "student"
            ? "Student Workspace"
            : "Dashboard";

  const handleProfileClick = () => {
    if (accountType === "admin") {
      navigate("/admin/admin-profile");
    } else if (accountType === "superadmin") {
      navigate("/admin/admin-profile");
    } else if (accountType === "student") {
      navigate("/student/profile");
    } else if (accountType === "teacher") {
      navigate("/teacher/profile");
    } else {
      navigate("/login");
    }
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onMenuClick}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-orange-200 hover:text-orange-500 md:hidden"
            aria-label="Open sidebar menu"
          >
            <FiMenu className="text-xl" />
          </button>

          {/* <button
            onClick={() => navigate(-1)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            aria-label="Go back"
          >
            <FiArrowLeft className="text-xl" />
          </button> */}

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              {roleLabel}
            </p>
            <h1 className="truncate text-lg font-semibold text-slate-900 sm:text-2xl">
              {title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            className="hidden h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-orange-200 hover:text-orange-500 sm:inline-flex"
            aria-label="Notifications"
          >
            <FiBell className="text-lg" />
          </button>
          <button
            className="hidden h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900 sm:inline-flex"
            aria-label="Settings"
          >
            <FiSettings onClick={handleProfileClick} className="text-lg" />
          </button>

          <button
            type="button"
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-2 py-2 text-left shadow-sm transition hover:border-orange-200"
          >
            <img
              src={profileImage}
              alt="Profile"
              className="h-10 w-10 rounded-2xl border border-slate-200 object-cover"
              onError={(e) => {
                e.target.src = "https://i.pravatar.cc/300";
              }}
            />
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-semibold text-slate-900">
                {fullName}
              </p>
              <p className="truncate text-xs text-slate-500">
                {accountType === "guest" ? "View account" : roleLabel}
              </p>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navigation;
