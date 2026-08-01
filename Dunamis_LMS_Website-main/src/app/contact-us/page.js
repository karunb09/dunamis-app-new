"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import {
  FaClock,
  FaEnvelope,
  FaFacebookF,
  FaInstagram,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaYoutube,
} from "react-icons/fa";
import { HiChatAlt2, HiMail, HiPencilAlt, HiUser } from "react-icons/hi";
import toast from "react-hot-toast";
import { createEnquiry, resetStatus } from "@/store/enquirySlice";

const CONTACT_CARDS = [
  {
    icon: FaPhoneAlt,
    title: "Call Us",
    lines: ["+91 93982 46083"],
    note: "Mon-Sat: 9 AM - 9 PM",
  },
  {
    icon: FaEnvelope,
    title: "Write To Us",
    lines: ["contact@dunamisindia.co.in"],
    note: "We usually reply within 24 hours",
  },
  {
    icon: FaMapMarkerAlt,
    title: "Visit Us",
    lines: [
      "Dunamis Music Private Limited",
      "8-87, 3rd Floor, Main Road, Nagaram, ECIL, Secunderabad, Hyderabad, Telangana 500083.",
    ],
    note: "Walk-ins are welcome",
  },
  {
    icon: FaClock,
    title: "Working Hours",
    lines: ["Mon-Sat: 9:00 AM - 9:00 PM", "Sunday: 10:00 AM - 6:00 PM"],
    note: "Online support across time zones",
  },
];

const INITIAL_FORM = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

const SOCIAL_LINKS = [
  {
    href: "https://www.youtube.com/@dunamisschoolofmusic4481",
    icon: FaYoutube,
    label: "YouTube",
  },
  {
    href: "https://www.instagram.com/dunamis_schoolofmusic/",
    icon: FaInstagram,
    label: "Instagram",
  },
  {
    href: "https://www.facebook.com/dunamismusic2021/",
    icon: FaFacebookF,
    label: "Facebook",
  },
];

export default function ContactPage() {
  const dispatch = useDispatch();
  const { status, error, errorDetails } = useSelector((state) => state.enquiry);
  const [form, setForm] = useState(INITIAL_FORM);

  const fieldErrors = useMemo(() => {
    return (errorDetails || []).reduce((acc, item) => {
      if (item?.field) {
        acc[item.field] = item.message;
      }
      return acc;
    }, {});
  }, [errorDetails]);

  useEffect(() => {
    if (status === "succeeded") {
      toast.success("Enquiry submitted successfully.");
      setForm(INITIAL_FORM);
      dispatch(resetStatus());
      return;
    }

    if (status === "failed" && error) {
      toast.error(error);
    }
  }, [dispatch, error, status]);

  useEffect(() => {
    return () => {
      dispatch(resetStatus());
    };
  }, [dispatch]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (status !== "idle") {
      dispatch(resetStatus());
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const payload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      subject: form.subject.trim(),
      message: form.message.trim(),
    };

    if (!payload.name) {
      toast.error("Full name is required.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      toast.error("Enter a valid email address.");
      return;
    }

    if (payload.subject.length < 3) {
      toast.error("Subject must be at least 3 characters.");
      return;
    }

    if (payload.message.length < 10) {
      toast.error("Message must be at least 10 characters.");
      return;
    }

    dispatch(createEnquiry(payload));
  };

  const renderFieldError = (field) => {
    if (!fieldErrors[field]) {
      return null;
    }

    return <p className="mt-2 text-sm text-red-600">{fieldErrors[field]}</p>;
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.14),_transparent_35%),linear-gradient(180deg,#fff7ed_0%,#ffffff_38%,#fff1e6_100%)] px-4 pb-10 pt-28 md:px-6 md:pt-32 lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="relative overflow-hidden rounded-[2rem] border border-orange-100 bg-white p-8 shadow-[0_24px_80px_-36px_rgba(234,88,12,0.45)] md:p-10"
        >
          <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-orange-200/40 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 rounded-full bg-amber-100/70 blur-3xl" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-4 py-2 text-sm font-medium text-orange-700">
              <HiChatAlt2 className="h-4 w-4" />
              Let&apos;s talk
            </div>

            <h1 className="mt-5 max-w-xl text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">
              Contact the team without hunting for the right inbox.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600 md:text-lg">
              Share what you need, where you are stuck, or what you want to
              explore next. The enquiry form routes straight into the admin
              workflow so your message does not disappear into a generic mailbox.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/courses"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:from-orange-600 hover:to-orange-600"
              >
                Explore Courses
              </Link>
              <Link
                href="/become-teacher"
                className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:border-orange-200 hover:text-orange-700"
              >
                Become an Instructor
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {CONTACT_CARDS.map(({ icon: Icon, title, lines, note }) => (
                <div
                  key={title}
                  className="rounded-3xl border border-gray-100 bg-orange-50/40 p-5 shadow-sm"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-orange-600 shadow-sm">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-lg font-semibold text-gray-900">
                    {title}
                  </h2>
                  <div className="mt-2 space-y-1 text-sm text-gray-700">
                    {lines.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                  <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
                    {note}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex items-center gap-3 text-gray-500">
              {SOCIAL_LINKS.map(({ href, icon: Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white transition hover:border-orange-200 hover:text-orange-600"
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08, ease: "easeOut" }}
          className="relative overflow-hidden rounded-[2rem] bg-white shadow-2xl ring-1 ring-black/5"
        >
          <div className="grid h-full grid-cols-1 md:grid-cols-[0.8fr_1.2fr]">
            <div className="relative hidden overflow-hidden bg-gradient-to-b from-orange-500 to-orange-600 p-8 text-white md:flex md:flex-col md:justify-between">
              <div>
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/15 backdrop-blur">
                  <HiChatAlt2 className="h-5 w-5" />
                </div>
                <h2 className="mt-6 text-3xl font-bold">Send an enquiry</h2>
                <p className="mt-3 text-sm leading-6 text-white/90">
                  Keep it direct. Tell us what you need and the team can route
                  it to the right admin immediately.
                </p>
              </div>

              <div className="space-y-4">
                <div className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                  <p className="text-sm font-medium text-white/80">Best for</p>
                  <p className="mt-2 text-sm text-white">
                    Admissions, course guidance, branch visits, partnerships,
                    support follow-ups, and general questions.
                  </p>
                </div>
              </div>

              <div className="pointer-events-none absolute -bottom-8 -left-10 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
              <div className="pointer-events-none absolute -right-12 top-10 h-36 w-36 rounded-full bg-amber-300/20 blur-2xl" />
            </div>

            <div className="p-8 md:p-10">
              <div className="max-w-xl">
                <h3 className="text-2xl font-semibold text-gray-900">
                  Start the conversation
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  This follows the same clean flow as login and signup. Fill the
                  fields below and submit once.
                </p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Full name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-gray-400">
                        <HiUser className="h-5 w-5" />
                      </span>
                      <input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Enter your full name"
                        required
                        className={`w-full rounded-full border bg-white px-12 py-3 text-gray-900 outline-none transition focus:ring-2 ${
                          fieldErrors.name
                            ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                            : "border-gray-200 focus:border-orange-600 focus:ring-orange-100"
                        }`}
                      />
                    </div>
                    {renderFieldError("name")}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Email address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-gray-400">
                        <HiMail className="h-5 w-5" />
                      </span>
                      <input
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="you@example.com"
                        required
                        className={`w-full rounded-full border bg-white px-12 py-3 text-gray-900 outline-none transition focus:ring-2 ${
                          fieldErrors.email
                            ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                            : "border-gray-200 focus:border-orange-600 focus:ring-orange-100"
                        }`}
                      />
                    </div>
                    {renderFieldError("email")}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-gray-400">
                        <HiPencilAlt className="h-5 w-5" />
                      </span>
                      <input
                        name="subject"
                        value={form.subject}
                        onChange={handleChange}
                        placeholder="How can we help you?"
                        required
                        minLength={3}
                        className={`w-full rounded-full border bg-white px-12 py-3 text-gray-900 outline-none transition focus:ring-2 ${
                          fieldErrors.subject
                            ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                            : "border-gray-200 focus:border-orange-600 focus:ring-orange-100"
                        }`}
                      />
                    </div>
                    {renderFieldError("subject")}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-4 text-gray-400">
                        <HiChatAlt2 className="h-5 w-5" />
                      </span>
                      <textarea
                        name="message"
                        rows={6}
                        value={form.message}
                        onChange={handleChange}
                        placeholder="Share the details so the team can respond clearly."
                        required
                        minLength={10}
                        className={`w-full rounded-[1.75rem] border bg-white px-12 py-4 text-gray-900 outline-none transition focus:ring-2 ${
                          fieldErrors.message
                            ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                            : "border-gray-200 focus:border-orange-600 focus:ring-orange-100"
                        }`}
                      />
                    </div>
                    {renderFieldError("message")}
                  </div>

                  {error && errorDetails.length === 0 ? (
                    <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className={`w-full rounded-full px-6 py-3 font-semibold text-white shadow-lg transition focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                      status === "loading"
                        ? "cursor-not-allowed bg-orange-400/70"
                        : "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-600"
                    }`}
                  >
                    {status === "loading" ? "Sending enquiry..." : "Send enquiry"}
                  </button>

                  <p className="text-center text-xs text-gray-500">
                    Your message goes straight to the internal enquiries queue.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
