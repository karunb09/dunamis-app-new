import React, { useState } from "react";
import { Link } from "react-router-dom";

const WEBSITE_URL = import.meta.env.VITE_WEBSITE_URL || "http://localhost:3000";

const SignInNavbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <nav className="border-b border-orange-100 bg-white/95 px-4 py-4 shadow-sm backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        {/* Logo */}
        <img
          src="/dunamisMusic.png"
          alt="DUNAMIS Logo"
          className="h-auto max-h-12 sm:max-h-14 w-auto ml-2"
        />

        {/* Hamburger for mobile */}
        <button
          className="sm:hidden flex flex-col justify-center items-center w-8 h-8"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          <span className="block w-6 h-0.5 bg-gray-800 mb-1"></span>
          <span className="block w-6 h-0.5 bg-gray-800 mb-1"></span>
          <span className="block w-6 h-0.5 bg-gray-800"></span>
        </button>

        {/* Menu Items (desktop) */}
        <div className="hidden items-center gap-3 sm:flex">
          <a
            href={WEBSITE_URL}
            className="inline-flex items-center justify-center rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_18px_40px_-22px_rgba(239,106,50,0.95)] transition hover:bg-orange-400"
          >
            Back to Website
          </a>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="flex flex-col gap-3 mt-4 sm:hidden">
          <a
            href={WEBSITE_URL}
            className="w-full rounded-full bg-orange-500 px-4 py-2 text-center text-sm font-semibold text-white shadow-[0_18px_40px_-22px_rgba(239,106,50,0.95)] transition hover:bg-orange-400"
            onClick={() => setOpen(false)}
          >
            Back to Website
          </a>
        </div>
      )}
    </nav>
  );
};

export default SignInNavbar;
