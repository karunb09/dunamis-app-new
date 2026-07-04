"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { LuBookOpen, LuShoppingCart, LuPhoneCall, LuBriefcaseBusiness, LuSchool, LuUsers, LuInfo, LuStar, LuCircleHelp, LuHeadphones, LuFileText, LuRotateCcw, LuShieldCheck, LuHeart } from "react-icons/lu";
import { FaFacebookF, FaInstagram, FaPhoneAlt, FaWhatsapp, FaYoutube } from "react-icons/fa";
import { DASHBOARD_URL } from "@/lib/siteConfig";

const featuredLinks = [
  { icon: LuBookOpen, label: "Courses", href: "/courses" },
  { icon: LuSchool, label: "Offline Centres", href: "/centres" },
  { icon: LuShoppingCart, label: "Store", href: "", external: true },
];

const learnLinks = [
  { icon: LuInfo, label: "About Us", href: "/about-us" },
  { icon: LuStar, label: "Reviews", href: "/testimonials" },
  { icon: LuCircleHelp, label: "FAQs", href: "/faqs" },
  { icon: LuUsers, label: "Success Stories", href: "/success-stories" },
  { icon: LuBriefcaseBusiness, label: "Become Instructor", href: "/become-teacher" },
  { icon: LuPhoneCall, label: "Contact", href: "/contact-us" },
];

const supportLinks = [
  { icon: LuPhoneCall, label: "Contact", href: "/contact-us" },
  { icon: LuHeadphones, label: "Support", href: "/support" },
  { icon: LuFileText, label: "Legal", href: "#" },
  { icon: LuRotateCcw, label: "Cancellation", href: "/refund-policy" },
  { icon: LuFileText, label: "Privacy Policy", href: "/privacy-policy" },
  { icon: LuShieldCheck, label: "Terms & Conditions", href: "/terms-and-conditions" },
  { icon: LuBriefcaseBusiness, label: "Staff Portal", href: DASHBOARD_URL, external: true },
];

const socials = [
  { href: "https://www.youtube.com/@dunamisschoolofmusic4481", icon: FaYoutube, label: "YouTube", hover: "hover:text-red-500" },
  { href: "https://www.instagram.com/dunamis_schoolofmusic/", icon: FaInstagram, label: "Instagram", hover: "hover:text-pink-500" },
  { href: "https://www.facebook.com/dunamismusic2021/", icon: FaFacebookF, label: "Facebook", hover: "hover:text-blue-600" },
  { href: "https://wa.me/+919398246083", icon: FaWhatsapp, label: "WhatsApp", hover: "hover:text-green-500" },
  { href: "tel:+919398246083", icon: FaPhoneAlt, label: "Call", hover: "hover:text-blue-500", tel: true },
];

function LinkGroup({ title, links }) {
  return (
    <div>
      <h4 className="text-[11px] sm:text-sm lg:text-base font-semibold text-[#FF6B35] mb-2 sm:mb-4 uppercase tracking-wide">
        {title}
      </h4>
      <ul className="space-y-1.5 sm:space-y-2.5">
        {links.map((item, i) => {
          const cls =
            "flex items-center gap-1.5 text-[11px] sm:text-sm text-gray-600 hover:text-[#FF6B35] transition-colors duration-200 leading-snug";
          const content = (
            <>
              <item.icon className="hidden sm:inline w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>{item.label}</span>
            </>
          );
          return (
            <li key={i}>
              {item.external ? (
                <a href={item.href} target="_blank" rel="noopener noreferrer" className={cls}>
                  {content}
                </a>
              ) : (
                <Link href={item.href} className={cls}>
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-200 pb-20 lg:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pt-8 sm:pt-12 pb-6 lg:py-12">

        {/*
          Layout logic:
          Mobile  : brand row (logo + socials inline) | 3-col links grid
          Desktop : 4-col grid (brand | featured | learn | support)
        */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">

          {/* ── Brand ── */}
          <div className="lg:col-span-1">
            {/* Mobile: logo left + socials right */}
            <div className="flex items-center justify-between lg:block">
              <Image
                src="/Dunamis.png"
                alt="Dunamis Logo"
                width={120}
                height={45}
                className="lg:w-[160px] lg:mx-auto"
              />
              {/* Socials — inline on mobile */}
              <div className="flex gap-3 sm:hidden">
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target={s.tel ? undefined : "_blank"}
                    rel={s.tel ? undefined : "noopener noreferrer"}
                    aria-label={s.label}
                    className={`text-gray-500 ${s.hover} transition-colors`}
                  >
                    <s.icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>

            {/* Description — only sm+ */}
            <p className="hidden sm:block text-gray-500 text-sm leading-relaxed mt-4 mb-5 text-center lg:text-left">
              Empowering learners worldwide with innovative music, dance &amp; language education.
            </p>

            {/* Socials — row on sm+, hidden on mobile (shown inline above) */}
            <div className="hidden sm:flex justify-center lg:justify-start gap-4">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target={s.tel ? undefined : "_blank"}
                  rel={s.tel ? undefined : "noopener noreferrer"}
                  aria-label={s.label}
                  className={`text-gray-500 ${s.hover} transition-colors`}
                >
                  <s.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/*
            Link columns:
            - Mobile: `grid grid-cols-3` puts all 3 groups side-by-side
            - lg:    `contents` removes this wrapper so the 3 children
                     slot directly into the parent 4-col grid as cols 2–4
          */}
          <div className="grid grid-cols-3 lg:contents gap-3 sm:gap-8">
            <LinkGroup title="Courses" links={featuredLinks} />
            <LinkGroup title="Learn more" links={learnLinks} />
            <LinkGroup title="Support" links={supportLinks} />
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 sm:py-4">
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs sm:text-sm text-gray-500 text-center">
            <span>© {new Date().getFullYear()}</span>
            <a
              href="https://dunamisindia.co.in"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#FF6B35] hover:text-[#ff4400] transition-colors"
            >
              Dunamis Music Private Limited. All rights reserved.
            </a>
            <span className="flex items-center gap-1">
              · Made with <LuHeart className="w-3 h-3 text-red-500 fill-current" /> by{" "}
              <a
                href="https://karunb09.github.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[#FF6B35] hover:text-[#ff4400] transition-colors"
              >
                KB
              </a>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
