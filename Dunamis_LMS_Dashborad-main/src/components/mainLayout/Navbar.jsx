import React from "react";
import { FiMenu, FiBell, FiSettings, FiArrowLeft } from "react-icons/fi";
import { useLocation, useNavigate } from "react-router-dom";

const IMAGE = import.meta.env.VITE_IMAGE;

const Navigation = ({ onMenuClick }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user')) || {};
  const fullName = `${user?.name?.firstName || 'User'} ${user?.name?.lastName || ''}`.trim();
  const accountType = user?.accountType || 'guest';

  const profileImage = user?.image
    ? (user.image.startsWith('http') ? user.image : `${IMAGE}${user.image}`)
    : 'https://i.pravatar.cc/300';

  const generateTitle = (path) => {
    const cleanPath = path.replace(/^\/|\/$/g, "").split("/");

    // Remove first segment (admin/teacher/student)
    const rolePrefixes = ['admin', 'teacher', 'student'];
    const filteredPath = cleanPath.filter((segment, index) => {
      // Remove first segment if it matches role prefix
      if (index === 0 && rolePrefixes.includes(segment.toLowerCase())) {
        return false;
      }

      // Remove MongoDB ObjectIds
      if (/^[0-9a-f]{24}$/i.test(segment)) {
        return false;
      }

      // Remove UUIDs
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
        return false;
      }

      // Remove numeric IDs
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

  const handleProfileClick = () => {
    if (accountType === "admin") {
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
    <header className="w-full bg-white shadow-sm border-b px-6 py-3 flex justify-between items-center">
      {/* Left section with Back Button + Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-gray-100 text-gray-700"
        >
          <FiArrowLeft className="text-xl" />
        </button>
        <span className="text-lg font-semibold text-gray-800">{title}</span>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
        <button className="p-2 rounded-full hover:bg-gray-100">
          <FiBell className="text-xl text-gray-700" />
        </button>
        <button className="p-2 rounded-full hover:bg-gray-100">
          <FiSettings className="text-xl text-gray-700" />
        </button>

        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={handleProfileClick}
        >
          <img
            src={profileImage}
            alt="Profile"
            className="w-8 h-8 rounded-full object-cover border border-gray-200"
            onError={(e) => {
              e.target.src = 'https://i.pravatar.cc/300';
            }}
          />
          <span className="text-gray-800 font-medium hidden sm:inline">
            {fullName}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Navigation;
