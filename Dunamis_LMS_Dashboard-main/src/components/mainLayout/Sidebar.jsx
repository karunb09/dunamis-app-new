import React, { useState, useMemo } from "react";
import {
  FiHome,
  FiBookOpen,
  FiClipboard,
  FiCheckSquare,
  FiBarChart2,
  FiLogOut,
  FiCalendar,
  FiEdit3,
  FiGrid,
  FiFileText,
  FiUser,
  FiUserCheck,
  FiDollarSign,
  FiMessageCircle,
  FiBell,
  FiChevronLeft,
  FiChevronRight,
  FiX,
} from "react-icons/fi";
import { PiStudentBold } from "react-icons/pi";
import { FaBuilding, FaBullhorn } from "react-icons/fa";
import { NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import { logoutUser } from "../../redux/authSlice";
import clsx from "clsx";
import { getStoredUser } from "../../utils/authSession";

const WEBSITE_URL = import.meta.env.VITE_WEBSITE_URL || "http://localhost:3000";

const Sidebar = ({ isOpen, onClose }) => {
  const [isDesktopOpen, setIsDesktopOpen] = useState(true);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const accountType =
    user?.accountType ||
    getStoredUser()?.accountType ||
    "guest";

  const permissions = user?.permissions || [];
  const isExpanded = isOpen || isDesktopOpen;
  const isAdminLike = !["student", "teacher", "guest"].includes(accountType);

  const studentMenu = [
    { to: "/home", icon: <FiHome />, text: "Home" },
    { to: "/my-courses", icon: <FiBookOpen />, text: "My Courses" },
    { to: "/explore-courses", icon: <FiClipboard />, text: "Explore Courses" },
    { to: "/assignments", icon: <FiCheckSquare />, text: "Assignments" },
    { to: "/homework", icon: <FiCheckSquare />, text: "Homework" },
    { to: "/performance", icon: <FiBarChart2 />, text: "My Performance" },
  ];

  const teacherMenu = [
    { to: "/teacher", icon: <FiHome />, text: "Home" },
    { to: "/teacher/courses", icon: <FiBookOpen />, text: "My Courses" },
    { to: "/teacher/students", icon: <PiStudentBold />, text: "My Students" },
    { to: "/teacher/schedule", icon: <FiCalendar />, text: "My Schedule" },
    { to: "/teacher/assignments", icon: <FiClipboard />, text: "Assignments" },
    {
      to: "/teacher/assessments",
      icon: <FiCheckSquare />,
      text: "Assessments",
    },
    {
      to: "/teacher/attendance",
      icon: <FiEdit3 />,
      text: "Attendance & Homework",
    },
    { to: "/teacher/reports", icon: <FiBarChart2 />, text: "Reports" },
  ];

  const adminMenu = [
    {
      section: null,
      items: [{ to: "/admin", icon: <FiHome />, text: "Home", permission: null }],
    },
    {
      section: "LEARNING MANAGEMENT",
      items: [
        {
          to: "/admin/course-management",
          icon: <FiBookOpen />,
          text: "Course Management",
          permission: "courseManagement",
        },
        {
          to: "/admin/course-requests",
          icon: <FiClipboard />,
          text: "Course Requests",
          permission: "courseManagement",
        },
        {
          to: "/admin/content-management",
          icon: <FiFileText />,
          text: "Content Management",
          permission: "contentManagement",
        },
        {
          to: "/admin/category-management",
          icon: <FiGrid />,
          text: "Category Management",
          permission: "categoryManagement",
        },
      ],
    },
    {
      section: "USER MANAGEMENT",
      items: [
        {
          to: "/admin/student-management",
          icon: <PiStudentBold />,
          text: "Student Management",
          permission: "studentManagement",
        },
        {
          to: "/admin/instructor-management",
          icon: <FiUser />,
          text: "Instructor Management",
          permission: "instructorManagement",
        },
        {
          to: "/admin/admin-management",
          icon: <FiUserCheck />,
          text: "Admin Management",
          permission: "adminManagement",
        },
      ],
    },
    {
      section: "OTHERS",
      items: [
        {
          to: "/admin/centers",
          icon: <FaBuilding />,
          text: "Offline Centers",
          permission: "offlineCenters",
        },
        {
          to: "/admin/financials",
          icon: <FiDollarSign />,
          text: "Financials",
          permission: "financials",
        },
        {
          to: "/admin/enquiries",
          icon: <FiMessageCircle />,
          text: "Enquiries",
          permission: "enquiries",
        },
        {
          to: "/admin/updates",
          icon: <FaBullhorn/>,
          text: "Updates",
          permission: "updates",
        },
        {
          to: "/admin/site-content",
          icon: <FiFileText />,
          text: "Website Content",
          permission: "contentManagement",
        },
      ],
    },
  ];

  const hasFullAccess = () => {
    return permissions.length === 0 || permissions.includes("allAccess");
  };

  const hasPermission = (permission) => {
    if (!permission) return true;
    if (hasFullAccess()) return true;
    return permissions.includes(permission);
  };

  const filteredAdminMenu = useMemo(() => {
    if (accountType !== "admin") return adminMenu;

    if (hasFullAccess()) {
      return adminMenu;
    }

    return adminMenu
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => hasPermission(item.permission)),
      }))
      .filter((section) => section.items.length > 0);
  }, [accountType, permissions]);

  const getMenuToRender = () => {
    if (accountType === "student") return studentMenu;
    if (accountType === "teacher") return teacherMenu;
    if (accountType === "guest") return [];
    return filteredAdminMenu;
  };

  const handleLogout = () => {
    dispatch(logoutUser())
      .finally(() => {
        toast.success("Logged out successfully!");
        navigate("/");
        onClose();
      });
  };

  const renderMenu = () => {
    const menu = getMenuToRender();

    if (isAdminLike) {
      return menu.map((section, index) => (
        <div key={index} className="mb-4">
          {section.section && isExpanded && (
            <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              {section.section}
            </div>
          )}

          {section.items.map((item, i) => (
            <SidebarLink
              key={`${index}-${i}`}
              to={item.to}
              icon={item.icon}
              text={item.text}
              onClick={onClose}
              isExpanded={isExpanded}
            />
          ))}
        </div>
      ));
    }

    return menu.map((item, index) => (
      <SidebarLink
        key={index}
        to={item.to}
        icon={item.icon}
        text={item.text}
        onClick={onClose}
        isExpanded={isExpanded}
      />
    ));
  };

  return (
    <>
      <div
        className={clsx(
          "fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm transition-opacity lg:hidden",
          { hidden: !isOpen }
        )}
        onClick={onClose}
      />

      <div
        className={clsx(
          "fixed inset-y-0 left-0 z-40 flex w-[290px] max-w-[84vw] flex-col border-r border-slate-800 bg-slate-950 shadow-2xl transition-all duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:max-w-none lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
          isDesktopOpen ? "lg:w-72" : "lg:w-20"
        )}
      >
        <div className="absolute top-1/2 -right-4 z-50 hidden -translate-y-1/2 lg:block">
          <button
            onClick={() => setIsDesktopOpen(!isDesktopOpen)}
            className="rounded-full border border-slate-200 bg-white p-1.5 text-slate-700 shadow-lg transition hover:bg-slate-50"
            aria-label={isDesktopOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <span className="text-lg transition-transform duration-200">
              {isDesktopOpen ? <FiChevronLeft /> : <FiChevronRight />}
            </span>
          </button>
        </div>

        <div className="flex h-full min-h-0 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div
              className={clsx(
                "flex items-center border-b border-slate-800 px-4 py-5",
                isExpanded ? "justify-between" : "justify-center"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
                  <img
                    src="/dunamisMusic.png"
                    alt="DUNAMIS Logo"
                    className="h-8 w-8 object-contain"
                  />
                </div>
                {isExpanded && (
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                      Dunamis
                    </p>
                    <p className="truncate text-base font-semibold text-white">
                      Learning Suite
                    </p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 lg:hidden"
                aria-label="Close sidebar"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            <div className="px-4 py-5 pb-6">
              {isExpanded && (
                <div className="mb-5 rounded-3xl border border-white/10 bg-gradient-to-br from-orange-500/20 via-orange-500/8 to-transparent px-4 py-4">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-orange-200/80">
                    Workspace
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-200">
                    Navigate courses, students, and operations from one place.
                  </p>
                </div>
              )}

              <nav className="flex flex-col gap-1.5">
                {renderMenu()}
              </nav>
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-800 px-4 py-5">
            <a
              href={WEBSITE_URL}
              onClick={onClose}
              className={clsx(
                "flex w-full items-center rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white",
                isExpanded ? "justify-start gap-3" : "justify-center"
              )}
              title={!isExpanded ? "Back to Website" : ""}
            >
              <span className="text-xl">
                <FiChevronLeft />
              </span>
              {isExpanded && <span>Back to Website</span>}
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

const SidebarLink = ({ icon, text, to, onClick, isExpanded }) => (
  <NavLink
    to={to}
    end
    onClick={onClick}
    title={!isExpanded ? text : ""}
    className={({ isActive }) =>
      clsx(
        "flex items-center rounded-2xl px-4 py-3 text-sm transition-all",
        isExpanded ? "justify-start gap-3" : "justify-center",
        isActive
          ? "bg-white text-slate-950 shadow-lg shadow-slate-950/20"
          : "text-slate-300 hover:bg-white/10 hover:text-white"
      )
    }
  >
    <span className="text-xl">{icon}</span>
    {isExpanded && <span className="font-medium">{text}</span>}
  </NavLink>
);

export default Sidebar;
