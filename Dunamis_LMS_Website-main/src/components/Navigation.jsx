"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { AnimatePresence, motion } from "framer-motion";
import { LuChevronDown, LuMenu, LuX } from "react-icons/lu";
import { logout, logoutSession } from "@/store/authSlice";
import { isStudentAccount } from "@/lib/roleRouting";

const primaryLinks = [
  { label: "Home", href: "/" },
  { label: "Courses", href: "/courses" },
  { label: "Offline Centres", href: "/centers" },
];

const secondaryLinks = [
  { label: "About Us", href: "/about-us" },
  { label: "Reviews", href: "/testimonials" },
  { label: "Success Stories", href: "/success-stories" },
  { label: "Become an Instructor", href: "/become-teacher" },
  { label: "FAQs", href: "/faqs" },
  { label: "Contact Us", href: "/contact-us" },
];
const mobileLinks = [...primaryLinks, ...secondaryLinks];

const isActivePath = (pathname, href) => {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
};

const Navigation = () => {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  // Seeded from the server-read session cookie, so this is correct on the very
  // first render on both server and client (no hydration mismatch).
  const { user, token } = useSelector((state) => state.auth || {});
  const isStudentSession = Boolean(token && user && isStudentAccount(user));
  const dropdownRef = useRef(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsMoreDropdownOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 16);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!dropdownRef.current?.contains(event.target)) {
        setIsMoreDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1280) {
        setIsMobileMenuOpen(false);
        setIsMoreDropdownOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
        setIsMoreDropdownOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const closeMenus = () => {
    setIsMobileMenuOpen(false);
    setIsMoreDropdownOpen(false);
  };

  useEffect(() => {
    if (token && user && !isStudentAccount(user)) {
      dispatch(logout());
    }
  }, [dispatch, token, user]);

  const handleLogout = () => {
    dispatch(logoutSession());
    closeMenus();
    router.replace("/");
  };

  const renderAuthActions = (mobile = false) => {
    if (!isStudentSession) {
      return (
        <>
          <a
            href="/signup"
            className={mobile
              ? "inline-flex flex-1 items-center justify-center rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-stone-300 hover:bg-stone-50"
              : "inline-flex min-w-[108px] items-center justify-center rounded-full border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-stone-300 hover:bg-stone-50"}
            onClick={closeMenus}
          >
            Sign Up
          </a>
          <Link
            href="/login"
            onClick={closeMenus}
            className={mobile
              ? "inline-flex flex-1 items-center justify-center rounded-full bg-[#CC3700] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#B83100]"
              : "inline-flex min-w-[168px] items-center justify-center rounded-full bg-[#CC3700] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#B83100]"}
          >
            Login
          </Link>
        </>
      );
    }

    return (
      <>
        <Link
          href="/student"
          onClick={() => {
            closeMenus();
          }}
          className={mobile
            ? "inline-flex flex-1 items-center justify-center rounded-full bg-[#CC3700] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#B83100]"
            : "inline-flex min-w-[168px] items-center justify-center rounded-full bg-[#CC3700] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#B83100]"}
        >
          Student Portal
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className={mobile
            ? "inline-flex flex-1 items-center justify-center rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-stone-300 hover:bg-stone-50"
            : "inline-flex min-w-[108px] items-center justify-center rounded-full border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-stone-300 hover:bg-stone-50"}
        >
          Logout
        </button>
      </>
    );
  };

  const renderPrimaryLink = (link, mobile = false) => {
    const active = isActivePath(pathname, link.href);

    return (
      <Link
        key={link.href}
        href={link.href}
        onClick={closeMenus}
        className={[
          "transition-colors duration-200",
          mobile
            ? "block rounded-2xl px-4 py-3 text-base font-medium"
            : "rounded-full px-4 py-2 text-sm font-medium",
          active
            ? "bg-[#fff1eb] text-[#CC3700]"
            : "text-slate-700 hover:bg-stone-100 hover:text-slate-950",
        ].join(" ")}
      >
        {link.label}
      </Link>
    );
  };

  const renderSecondaryLinks = (mobile = false) =>
    secondaryLinks.map((link) => {
      const active = isActivePath(pathname, link.href);

      return (
        <Link
          key={link.href}
          href={link.href}
          onClick={closeMenus}
          className={[
            "transition-colors duration-200",
            mobile
              ? "block rounded-2xl px-4 py-3 text-sm font-medium"
              : "block px-4 py-2.5 text-sm",
            active
              ? "bg-[#fff1eb] text-[#CC3700]"
              : "text-slate-600 hover:bg-stone-50 hover:text-slate-950",
          ].join(" ")}
        >
          {link.label}
        </Link>
      );
    });

  const renderMobileLinks = () =>
    mobileLinks.map((link) => {
      const active = isActivePath(pathname, link.href);

      return (
        <Link
          key={link.href}
          href={link.href}
          onClick={closeMenus}
          className={[
            "block rounded-2xl px-4 py-3 text-sm font-medium transition-colors duration-200",
            active
              ? "bg-[#fff1eb] text-[#CC3700]"
              : "text-slate-700 hover:bg-stone-50 hover:text-slate-950",
          ].join(" ")}
        >
          {link.label}
        </Link>
      );
    });

  return (
    <>
      <header
        className={[
          "sticky top-0 z-50 border-b transition-all duration-300",
          scrolled
            ? "border-stone-200/80 bg-[rgba(255,250,244,0.92)] shadow-[0_20px_50px_-32px_rgba(15,23,42,0.45)] backdrop-blur-xl"
            : "border-transparent bg-[rgba(255,250,244,0.96)]",
        ].join(" ")}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6 lg:px-8">
          <Link
            href="/"
            onClick={closeMenus}
            className="flex items-center gap-3 rounded-full bg-white px-3 py-2 shadow-sm ring-1 ring-stone-200 transition hover:ring-stone-300"
          >
            <div className="relative h-10 w-[104px] sm:h-11 sm:w-[116px]">
              <Image
                src="/Dunamis.png"
                alt="Dunamis Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>

          <div className="hidden flex-1 items-center justify-between rounded-full border border-stone-200 bg-white/90 px-3 py-2 shadow-sm lg:flex">
            <nav className="flex items-center gap-1">
              {primaryLinks.map((link) => renderPrimaryLink(link))}

              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsMoreDropdownOpen((open) => !open)}
                  className={[
                    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200",
                    secondaryLinks.some((link) =>
                      isActivePath(pathname, link.href),
                    ) || isMoreDropdownOpen
                      ? "bg-[#fff1eb] text-[#CC3700]"
                      : "text-slate-700 hover:bg-stone-100 hover:text-slate-950",
                  ].join(" ")}
                  aria-expanded={isMoreDropdownOpen}
                  aria-label="Open more pages"
                >
                  More
                  <LuChevronDown
                    className={[
                      "h-4 w-4 transition-transform",
                      isMoreDropdownOpen ? "rotate-180" : "",
                    ].join(" ")}
                  />
                </button>

                <AnimatePresence>
                  {isMoreDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="absolute left-0 top-full mt-3 w-60 overflow-hidden rounded-3xl border border-stone-200 bg-white p-2 shadow-[0_24px_70px_-36px_rgba(15,23,42,0.65)]"
                    >
                      {renderSecondaryLinks()}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </nav>

            <div className="ml-4 flex items-center gap-3">
              {renderAuthActions()}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2 lg:hidden">
            <Link
              href={isStudentSession ? "/student" : "/login"}
              onClick={closeMenus}
              className="hidden items-center justify-center rounded-full bg-[#CC3700] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#B83100] sm:inline-flex"
            >
              {isStudentSession ? "Student Portal" : "Login"}
            </Link>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-stone-200 bg-white text-slate-700 shadow-sm transition hover:border-stone-300 hover:bg-stone-50"
              aria-label="Open navigation menu"
            >
              <LuMenu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/*
        No tablet-range bottom nav here — MobileBottomNav (0–767px) and the
        full header nav (lg:flex, 1024px+) used to leave a 640–1023px gap
        that this component also tried to fill, producing two stacked fixed
        bottom bars at 640–767px and unpadded content under this bar at
        768–1023px. Tablet users keep full parity via the header's
        Login/Student Portal button (sm:inline-flex, 640px+) and the
        hamburger menu below, which already lists every link this bar had.
      */}

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden"
            onClick={closeMenus}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-[420px] flex-col bg-[linear-gradient(180deg,#fffaf4_0%,#ffffff_60%,#fff7ef_100%)] shadow-2xl xl:hidden"
          >
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <Link
            href="/"
            onClick={closeMenus}
            className="relative h-11 w-[118px]"
          >
            <Image
              src="/Dunamis.png"
              alt="Dunamis Logo"
              fill
              className="object-contain"
              priority
            />
          </Link>
          <button
            type="button"
            onClick={closeMenus}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-stone-200 bg-white text-slate-700 transition hover:bg-stone-50"
            aria-label="Close navigation menu"
          >
            <LuX className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6">
          <div className="rounded-[28px] border border-orange-100 bg-gradient-to-br from-white via-[#fff8f3] to-[#fff1e8] px-4 py-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-stone-400">
              Quick access
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {renderAuthActions(true)}
            </div>
          </div>

          <div className="mt-4 rounded-[28px] border border-stone-200 bg-white px-4 py-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-stone-400">
              Menu
            </p>
            <div className="mt-3 space-y-1">
              {renderMobileLinks()}
            </div>
          </div>
        </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navigation;
