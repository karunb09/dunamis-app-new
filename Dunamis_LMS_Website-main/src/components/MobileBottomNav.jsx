"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HiHome,
  HiAcademicCap,
  HiLocationMarker,
  HiStar,
  HiPhone,
} from "react-icons/hi";

const ITEMS = [
  { label: "Home", href: "/", icon: HiHome },
  { label: "Courses", href: "/courses", icon: HiAcademicCap },
  { label: "Centres", href: "/centers", icon: HiLocationMarker },
  { label: "Reviews", href: "/testimonials", icon: HiStar },
  { label: "Contact", href: "/contact-us", icon: HiPhone },
];

const isActive = (pathname, href) =>
  href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);

export default function MobileBottomNav() {
  const pathname = usePathname() || "/";

  // Keep the public bottom nav out of the authenticated areas.
  if (
    pathname.startsWith("/student") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup")
  ) {
    return null;
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <ul className="grid grid-cols-5">
        {ITEMS.map(({ label, href, icon: Icon }) => {
          const active = isActive(pathname, href);
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
