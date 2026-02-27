"use client";

import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { FiSend } from "react-icons/fi";
import {
  FaLinkedin,
  FaInstagram,
  FaTelegram,
  FaPhoneAlt,
  FaEnvelope,
  FaMapMarkerAlt,
  FaClock,
} from "react-icons/fa";
import { createEnquiry } from "@/store/enquirySlice";
import toast from "react-hot-toast";


export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const dispatch = useDispatch();
  const { status, error } = useSelector((state) => state.enquiry);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(createEnquiry(form));
  };

  useEffect(() => {
    if (status === "succeeded") {
      toast.success("Enquiry submitted successfully!");
      setForm({ name: "", email: "", subject: "", message: "" });
    }

    if (status === "failed") {
      toast.error("Failed to submit enquiry. Please try again.");
    }
  }, [status]);

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* Left Panel */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col justify-center px-10 py-16"
      >
        <div>
          <h1 className="text-3xl font-bold text-black">
            Contact <span className="text-orange-600">Us.</span>
          </h1>
          <p className="text-gray-600 text-lg mt-4">
            We will read all emails one by one and will not miss them. Send us
            any message you want, and we will reply to it.
          </p>
          <p className="text-sm text-gray-500 mt-3">
            We need your <strong>Name</strong> and{" "}
            <strong>Email Address</strong>, but you won’t receive anything
            except our reply only.
          </p>

          <div className="mt-8">
            <p className="text-gray-800 font-semibold mb-3">
              Get in touch with us on
            </p>
            <div className="flex space-x-4">
              <a
                href="#"
                className="bg-gray-200 hover:bg-orange-100 p-2 rounded-md"
              >
                <FaLinkedin
                  size={20}
                  className="text-gray-600 hover:text-orange-600"
                />
              </a>
              <a
                href="#"
                className="bg-gray-200 hover:bg-orange-100 p-2 rounded-md"
              >
                <FaInstagram
                  size={20}
                  className="text-gray-600 hover:text-orange-600"
                />
              </a>
              <a
                href="#"
                className="bg-gray-200 hover:bg-orange-100 p-2 rounded-md"
              >
                <FaTelegram
                  size={20}
                  className="text-gray-600 hover:text-orange-600"
                />
              </a>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm text-gray-700">
            <div>
              <h4 className="font-semibold flex items-center gap-2 text-base mb-1">
                <FaPhoneAlt /> Phone
              </h4>
              <p>+91 98765 43210</p>
              <p>+91 98765 43211</p>
              <p className="text-xs text-gray-500 mt-1">Mon-Sat: 9 AM - 9 PM</p>
            </div>

            <div>
              <h4 className="font-semibold flex items-center gap-2 text-base mb-1">
                <FaEnvelope /> Email
              </h4>
              <p>info@dunamis.in</p>
              <p>support@dunamis.in</p>
              <p className="text-xs text-gray-500 mt-1">
                We'll respond within 24 hours
              </p>
            </div>

            <div>
              <h4 className="font-semibold flex items-center gap-2 text-base mb-1">
                <FaMapMarkerAlt /> Head Office
              </h4>
              <p>DUNAMIS Creative Hub</p>
              <p>Bandra West, Mumbai - 400050</p>
              <p className="text-xs text-gray-500 mt-1">Visit us anytime</p>
            </div>

            <div>
              <h4 className="font-semibold flex items-center gap-2 text-base mb-1">
                <FaClock /> Business Hours
              </h4>
              <p>Mon-Sat: 9:00 AM - 9:00 PM</p>
              <p>Sunday: 10:00 AM - 6:00 PM</p>
              <p className="text-xs text-gray-500 mt-1">
                All time zones supported online
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Right Panel - Contact Form */}
      <div
        className="relative flex items-center justify-center px-6 py-12"
        style={{
          backgroundImage: `url('/BG-1.jpg')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/60 z-0"></div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          viewport={{ once: false }}
          className="z-10 bg-black/50 backdrop-blur-md p-10 rounded-xl w-full max-w-lg text-white shadow-2xl"
        >
          <h2 className="text-2xl font-bold mb-6">Send Us A Message</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex space-x-4">
              <input
                name="name"
                placeholder="First Name"
                value={form.name}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-transparent border border-gray-400 rounded-md text-white placeholder-gray-300 focus:outline-none"
                required
              />
              <input
                name="email"
                type="email"
                placeholder="Email Address"
                value={form.email}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-transparent border border-gray-400 rounded-md text-white placeholder-gray-300 focus:outline-none"
                required
              />
            </div>
            <input
              name="subject"
              placeholder="Subject"
              value={form.subject}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-transparent border border-gray-400 rounded-md text-white placeholder-gray-300 focus:outline-none"
              required
            />
            <textarea
              name="message"
              placeholder="Message"
              rows={4}
              value={form.message}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-transparent border border-gray-400 rounded-md text-white placeholder-gray-300 focus:outline-none"
              required
            ></textarea>

            <button
              type="submit"
              className="cursor-pointer w-full mt-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-md flex justify-center items-center gap-2 transition-all duration-200"
              disabled={status === "loading"}
            >
              {status === "loading" ? (
                "Sending..."
              ) : (
                <>
                  <FiSend size={18} /> Send Message
                </>
              )}
            </button>
            {error && (
              <p className="text-sm text-red-400 text-center mt-2">
                {typeof error === "string" ? error : "Something went wrong."}
              </p>
            )}
          </form>
        </motion.div>
      </div>
    </div>
  );
}
