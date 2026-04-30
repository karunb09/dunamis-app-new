"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  BookOpen,
  ShoppingCart,
  PhoneCall,
  BriefcaseBusiness,
  School,
  Users,
  Info,
  Star,
  HelpCircle,
  Headphones,
  FileText,
  RotateCcw,
  ShieldCheck,
  Heart,
} from "lucide-react";
import { FaFacebookF, FaInstagram, FaPhoneAlt, FaWhatsapp, FaYoutube } from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="relative bg-white border-t border-gray-300">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-12 pb-8 lg:py-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8">
          {/* Brand Section */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <div className="mb-4">
              <Image
                src="/Dunamis.png"
                alt="Dunamis Logo"
                width={160}
                height={60}
              />
            </div>
            <p className="text-gray-600 mb-6 text-sm leading-relaxed">
              Empowering music learners worldwide with innovative online and
              offline education from complete beginners to professional
              musicians.
            </p>

            {/* Social Icons */}
            <div className="flex space-x-4">
              <a
                href="https://www.youtube.com/@dunamisschoolofmusic4481"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-red-500 transition-colors"
                aria-label="YouTube"
              >
                <FaYoutube className="w-5 h-5" />
              </a>
              <a
                href="https://www.instagram.com/dunamis_schoolofmusic/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-pink-500 transition-colors"
                aria-label="Instagram"
              >
                <FaInstagram className="w-5 h-5" />
              </a>
              <a
                href="https://www.facebook.com/dunamismusic2021/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-blue-600 transition-colors"
                aria-label="Facebook"
              >
                <FaFacebookF className="w-5 h-5" />
              </a>
              <a
                href="https://wa.me/+919398246083"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-green-500 transition-colors"
                aria-label="WhatsApp"
              >
                <FaWhatsapp className="w-5 h-5" />
              </a>
              <a
                href="tel:+919398246083"
                className="text-gray-500 hover:text-blue-500 transition-colors"
                aria-label="Call Dunamis"
              >
                <FaPhoneAlt className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Featured Courses */}
          <div>
            <h4 className="text-base font-semibold text-[#FF6B35] mb-4">
              Featured Courses
            </h4>
            <ul className="space-y-2.5">
              {[
                { icon: BookOpen, label: "Courses", href: "/courses" },
                { icon: School, label: "Offline Centres", href: "#" },
                {
                  icon: ShoppingCart,
                  label: "Store",
                  href: "",
                  external: true,
                },
              ].map((item, index) => (
                <li key={index}>
                  {item.external ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-[#FF6B35] transition-colors duration-200"
                    >
                      <item.icon className="w-4 h-4 text-gray-400" />
                      {item.label}
                    </a>
                  ) : (
                    <Link
                      href={item.href}
                      className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-[#FF6B35] transition-colors duration-200"
                    >
                      <item.icon className="w-4 h-4 text-gray-400" />
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Learn More */}
          <div>
            <h4 className="text-base font-semibold text-[#FF6B35] mb-4">
              Learn more
            </h4>
            <ul className="space-y-2.5">
              {[
                { icon: Info, label: "About Us", href: "/about-us" },
                { icon: Star, label: "Reviews", href: "/testimonials" },
                { icon: HelpCircle, label: "FAQs", href: "/faqs" },
                { icon: Users, label: "Success Stories", href: "/success-stories" },
                {
                  icon: BriefcaseBusiness,
                  label: "Become an Instructor",
                  href: "/become-teacher",
                },
                { icon: PhoneCall, label: "Contact", href: "/contact-us" },
              ].map((item, index) => (
                <li key={index}>
                  <Link
                    href={item.href}
                    className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-[#FF6B35] transition-colors duration-200"
                  >
                    <item.icon className="w-4 h-4 text-gray-400" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Community */}
          <div>
            <h4 className="text-base font-semibold text-[#FF6B35] mb-4">
              Community
            </h4>
            <ul className="space-y-2.5">
              {[
                { icon: Users, label: "Community", href: "/community" },
                { icon: Star, label: "Events", href: "/events" },
                { icon: FileText, label: "Shared Recordings", href: "/recordings" },
                { icon: Info, label: "Contests", href: "/contests" },
                { icon: FileText, label: "Articles", href: "/articles" },
                { icon: HelpCircle, label: "Discussions", href: "/discussions" },
                { icon: PhoneCall, label: "Music Apps", href: "/music-apps" },
              ].map((item, index) => (
                <li key={index}>
                  <Link
                    href={item.href}
                    className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-[#FF6B35] transition-colors duration-200"
                  >
                    <item.icon className="w-4 h-4 text-gray-400" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-base font-semibold text-[#FF6B35] mb-4">
              Support
            </h4>
            <ul className="space-y-2.5">
              {[
                { icon: PhoneCall, label: "Contact", href: "/contact-us" },
                { icon: Headphones, label: "Support", href: "/support" },
                { icon: FileText, label: "Legal", href: "#" },
                {
                  icon: RotateCcw,
                  label: "Cancellation & Refund",
                  href: "/refund-policy",
                },
                {
                  icon: FileText,
                  label: "Privacy Policy",
                  href: "/privacy-policy",
                },
                {
                  icon: ShieldCheck,
                  label: "Terms & Conditions",
                  href: "/terms-and-conditions",
                },
              ].map((item, index) => (
                <li key={index}>
                  <Link
                    href={item.href}
                    className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-[#FF6B35] transition-colors duration-200"
                  >
                    <item.icon className="w-4 h-4 text-gray-400" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-sm text-gray-600">
            <span>© {new Date().getFullYear()}</span>
            <a
              href="https://dunamisindia.co.in"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#FF6B35] hover:text-[#ff4400] transition-colors duration-200"
            >
              Dunamis Music Private Limited. All rights reserved.
            </a>
            <span className="flex items-center gap-1">
              • Made with <Heart className="w-3 h-3 text-red-500 fill-current" />
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
