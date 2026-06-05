"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HiHome,
  HiAcademicCap,
  HiClipboardList,
  HiUser,
  HiUpload,
} from "react-icons/hi";

const ITEMS = [
  { label: "Dashboard", href: "/student", icon: HiHome, exact: true },
  { label: "My Courses", href: "/student/my-courses", icon: HiAcademicCap },
  { label: "Assignments", href: "/student/assignments", icon: HiClipboardList },
  { label: "Upload", href: "/student/upload", icon: HiUpload },
  { label: "Profile", href: "/student/profile", icon: HiUser },
];

const isActive = (pathname, href, exact) =>
  exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

export default function StudentBottomNav() {
  const pathname = usePathname() || "/student";

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Student navigation"
    >
      <ul className="grid grid-cols-5">
        {ITEMS.map(({ label, href, icon: Icon, exact }) => {
          const active = isActive(pathname, href, exact);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition ${
                  active ? "text-orange-600" : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <Icon className="text-xl" />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
