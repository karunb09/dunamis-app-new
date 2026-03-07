import React, { useState } from "react";
import { Link } from "react-router-dom";

const WEBSITE_URL = import.meta.env.VITE_WEBSITE_URL || "http://localhost:3003";

const SignInNavbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <nav className="bg-white shadow px-4 sm:px-6 py-4">
      <div className="flex justify-between items-center">
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
        <div className="hidden sm:flex gap-3 items-center">
          <Link
            to="/"
            className="px-4 py-2 rounded-full text-gray-700 hover:bg-gray-100"
          >
            Login
          </Link>
          <a
            href={`${WEBSITE_URL}/signup`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-full bg-black text-white hover:bg-gray-900"
          >
            Sign Up
          </a>
          <a
            href={WEBSITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Back to Website
          </a>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="flex flex-col gap-3 mt-4 sm:hidden">
          <Link
            to="/"
            className="px-4 py-2 rounded-full text-center border border-gray-200"
            onClick={() => setOpen(false)}
          >
            Login
          </Link>
          <a
            href={`${WEBSITE_URL}/signup`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-black text-white px-4 py-2 rounded-full w-full text-center"
            onClick={() => setOpen(false)}
          >
            Sign Up
          </a>
          <a
            href={WEBSITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-full w-full text-center border border-gray-300 text-gray-700"
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
