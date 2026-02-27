import React, { useState } from "react";

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
        <ul className="hidden sm:flex gap-6 items-center">
          <li className="cursor-pointer">Courses</li>
          <li className="cursor-pointer">Offline Centres</li>
          <li className="cursor-pointer">Store</li>
          <li className="cursor-pointer">More</li>
          <li className="cursor-pointer">Login</li>
          <li>
            <button className="bg-blue-900 text-white px-4 py-2 rounded-full">
              Sign Up
            </button>
          </li>
        </ul>
      </div>

      {/* Mobile Menu */}
      {open && (
        <ul className="flex flex-col gap-4 mt-4 sm:hidden">
          <li className="cursor-pointer">Courses</li>
          <li className="cursor-pointer">Offline Centres</li>
          <li className="cursor-pointer">Store</li>
          <li className="cursor-pointer">More</li>
          <li className="cursor-pointer">Login</li>
          <li>
            <button className="bg-blue-900 text-white px-4 py-2 rounded-full w-full">
              Sign Up
            </button>
          </li>
        </ul>
      )}
    </nav>
  );
};

export default SignInNavbar;
