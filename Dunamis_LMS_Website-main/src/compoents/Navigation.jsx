"use client";

import { Menu, X, ChevronDown } from "lucide-react";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

const Navigation = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false);
  const [showNavbar, setShowNavbar] = useState(true);

  useEffect(() => {
    setIsClient(true);

    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      setScrolled(currentScrollY > 20);

      // Hide on scroll down, show on scroll up
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setShowNavbar(false);
      } else {
        setShowNavbar(true);
      }

      lastScrollY = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!isClient) return null;

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setIsMoreDropdownOpen(false);
  };
  const toggleMoreDropdown = () => setIsMoreDropdownOpen(!isMoreDropdownOpen);

  const NavLinks = ({ mobile = false }) => {
    const pathname = usePathname();
    // Route mapping
    const routes = {
      Home: "/",
      Courses: "/courses",
      "Offline Centres": "/centers",
      Store: "/store",
    };

    return (
      <>
        {Object.entries(routes).map(([item, href], i) => (
          <Link
            key={i}
            href={href}
            className={`relative font-medium transition-all duration-300 group ${mobile
              ? `text-lg ${pathname === href ? "text-[#FF6B35]" : "text-gray-700 hover:text-[#FF6B35]"} py-2`
              : `${pathname === href ? "text-[#FF6B35]" : "text-gray-700 hover:text-[#FF6B35]"}`
              }`}
            onClick={closeMobileMenu}
          >
            {item}
            <span className={`absolute bottom-0 left-0 h-0.5 bg-[#FF6B35] transition-all duration-300 ${pathname === href ? "w-full" : "w-0 group-hover:w-full"}`}></span>
          </Link>
        ))}

        {/* More Dropdown */}
        <div className="relative">
          <button
            onClick={toggleMoreDropdown}
            className={`relative font-medium transition-all duration-300 group ${mobile
              ? "text-lg text-gray-700 hover:text-[#FF6B35] py-2"
              : "text-gray-700 hover:text-[#FF6B35]"
              }`}
          >
            More
            <ChevronDown
              className="inline ml-1 transition-transform duration-300 group-hover:rotate-180"
              size={16}
            />
          </button>

          {/* Desktop Dropdown */}
          {isMoreDropdownOpen && !mobile && (
            <div className="absolute left-0 mt-2 w-48 rounded-lg shadow-lg bg-white/90 backdrop-blur-md border border-gray-200">
              <div className="py-2 text-sm">
                {[
                  { label: "About Us", href: "/about-us" },
                  { label: "Testimonials", href: "/testimonials" },
                  { label: "Success Stories", href: "/success-stories" },
                  { label: "Become a Teacher", href: "/become-teacher" },
                  { label: "FAQs", href: "/faqs" },
                  { label: "Contact Us", href: "/contact-us" },
                ].map((link, i) => (
                  <Link
                    key={i}
                    href={link.href}
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                    onClick={closeMobileMenu}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Mobile Dropdown */}
          {isMoreDropdownOpen && mobile && (
            <div className="mt-2 pl-4 space-y-2">
              {[
                { label: "About Us", href: "/about-us" },
                { label: "Testimonials", href: "/testimonials" },
                { label: "Success Stories", href: "/success-stories" },
                { label: "Become a Teacher", href: "/become-teacher" },
                { label: "FAQs", href: "/faqs" },
                { label: "Contact Us", href: "/contact-us" },
              ].map((link, i) => (
                <Link
                  key={i}
                  href={link.href}
                  className="block text-gray-700 hover:text-[#FF6B35]"
                  onClick={closeMobileMenu}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}
        </div>


        {/* Auth Buttons https://dunamis-lms-dashboard.netlify.app*/}
        <div
          className={`flex ${mobile ? "flex-col space-y-2 mt-4" : "items-center space-x-4"
            }`}
        >
          <Link
            href="https://dashboard.dunamisindia.co.in/"
            className={`relative font-medium transition-all duration-300 group ${mobile
              ? "text-lg text-gray-700 hover:text-[#FF6B35] py-2"
              : "text-gray-700 hover:text-[#FF6B35]"
              }`}
            onClick={closeMobileMenu}
          >
            Login
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#FF6B35] transition-all duration-300 group-hover:w-full"></span>
          </Link>
          <Link
            href="/signup"
            className={`px-4 py-2 bg-[#FF6B35] text-white rounded-xl hover:bg-[#ff4400] transition-all duration-300 text-sm font-medium ${mobile ? "w-full text-center" : ""
              }`}
            onClick={closeMobileMenu}
          >
            Sign Up
          </Link>
        </div>
      </>
    );
  };


  return (
    <div>
      {/* Main Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${showNavbar ? "translate-y-0" : "-translate-y-full"
          } ${scrolled ? "backdrop-blur-md bg-white shadow-md" : "bg-white"}`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-2 lg:py-3">
          {/* Logo */}
          <Link href="/" onClick={closeMobileMenu} className="flex-shrink-0">
            <div className="h-10 w-[120px] lg:h-12 lg:w-[140px] relative">
              <Image
                src="/Dunamis.png"
                alt="Dunamis Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            <NavLinks />
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMobileMenu}
            className={`lg:hidden p-2 rounded-xl transition-all duration-300 ${isMobileMenuOpen
              ? "bg-red-50 text-red-600"
              : "bg-gray-50 text-gray-700 hover:bg-gray-100"
              }`}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-all duration-300 lg:hidden ${isMobileMenuOpen ? "opacity-100 visible" : "opacity-0 invisible"
          }`}
        onClick={closeMobileMenu}
      />

      {/* Mobile Menu */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white z-50 transition-transform duration-300 transform shadow-2xl lg:hidden ${isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
      >
        {/* Mobile Header */}
        <div className="flex justify-between items-center px-6 py-3 border-b border-gray-100 bg-gray-50">
          <Link
            href="/"
            onClick={closeMobileMenu}
            className="h-[50px] w-[130px] relative"
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
            onClick={closeMobileMenu}
            className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors duration-300"
          >
            <X size={24} />
          </button>
        </div>

        {/* Mobile Navigation */}
        <div className="flex flex-col px-6 py-6 space-y-2 flex-1 overflow-y-auto">
          <NavLinks mobile />
        </div>
      </div>
    </div>
  );
};

export default Navigation;