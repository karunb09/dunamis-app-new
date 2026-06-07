"use client";

import MultiStepForm from "@/components/BecomeTeacherForm/BecomeTeacherForm";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Heart, Clock, Users, Award, GraduationCap } from "lucide-react";
import { useEffect, useState } from "react";

const WHY_TEACH = [
  {
    icon: Heart,
    label: "Make a Difference",
    body: "Impact lives by sharing your passion and helping students discover their creative potential.",
    color: "#FF6B35",
  },
  {
    icon: Clock,
    label: "Flexible Schedule",
    body: "Choose your own hours and teach according to your availability with both online and offline options.",
    color: "#47c9c4",
  },
  {
    icon: Users,
    label: "Supportive Community",
    body: "Join a network of passionate educators and be part of a collaborative teaching environment.",
    color: "#a855f7",
  },
  {
    icon: Award,
    label: "Professional Growth",
    body: "Access continuous training, workshops, and opportunities for career advancement.",
    color: "#22c55e",
  },
];

const REQUIREMENTS = [
  "Proven expertise in your subject area (minimum 3 years experience)",
  "Relevant qualifications or certifications in your field",
  "Excellent communication and interpersonal skills",
  "Passion for teaching and mentoring students",
  "Availability for a regular teaching schedule",
  "Basic computer skills for online teaching",
];

export default function BecomeTeacher() {
  const images = [
    "/Music-rafiki.svg",
    "/Playing Music-bro.svg",
    "/Compose music-amico.svg",
    "/Compose music-bro.svg",
  ];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [images.length]);

  const imgVariants = {
    enter: (d) => ({ x: d > 0 ? 80 : -80, opacity: 0, scale: 0.95 }),
    center: { zIndex: 1, x: 0, opacity: 1, scale: 1, transition: { duration: 0.6, ease: "easeOut" } },
    exit: (d) => ({ zIndex: 0, x: d > 0 ? -80 : 80, opacity: 0, scale: 0.95, transition: { duration: 0.5, ease: "easeIn" } }),
  };

  return (
    <div className="bg-[#fffaf4]">

      {/* ── Dark Hero ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-[#09090f] py-28 px-6 rounded-b-[52px]">
        <div className="orb absolute -top-32 -left-32 w-[400px] h-[400px] bg-orange-500/18" style={{ "--dur": "16s" }} />
        <div className="orb absolute top-0 right-0 w-80 h-80 bg-teal-500/12" style={{ "--dur": "20s", animationDelay: "5s" }} />

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-sm font-medium text-orange-400"
          >
            <GraduationCap className="w-4 h-4" /> Join Our Team
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mt-5 text-4xl md:text-6xl font-extrabold text-white leading-tight"
          >
            Become an{" "}
            <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              Instructor
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-5 text-base text-white/60 max-w-2xl mx-auto leading-relaxed"
          >
            Share your expertise and passion with aspiring learners. Join{" "}
            <span className="font-semibold text-white">DUNAMIS</span> as an instructor
            and be part of a community that believes in transformative education.
          </motion.p>
        </div>

      </div>

      {/* ── Why Teach — dark section ──────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-[#0d0d1a] py-24 px-6 mt-5 rounded-[52px] mx-4 md:mx-8">
        <div className="orb absolute bottom-0 left-1/3 w-72 h-72 bg-purple-600/10" style={{ "--dur": "18s" }} />

        <div className="relative z-10 mx-auto max-w-6xl">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl font-bold text-white text-center mb-14"
          >
            Why Teach with{" "}
            <span className="bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">
              DUNAMIS?
            </span>
          </motion.h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {WHY_TEACH.map(({ icon: Icon, label, body, color }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ y: -4 }}
                className="rounded-2xl border bg-white/5 backdrop-blur-sm p-6 text-center transition-transform"
                style={{ borderColor: `${color}30` }}
              >
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl mx-auto mb-4"
                  style={{ background: `${color}18`, boxShadow: `0 0 20px ${color}25` }}
                >
                  <Icon className="w-6 h-6" style={{ color }} />
                </div>
                <h3 className="text-base font-bold text-white mb-2">{label}</h3>
                <p className="text-sm text-white/55 leading-relaxed">{body}</p>
              </motion.div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Requirements ─────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-6 py-20">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="text-3xl font-bold text-center text-gray-900 mb-12"
        >
          What We&apos;re Looking For
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="rounded-3xl border border-orange-100 bg-white p-8 shadow-sm"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {REQUIREMENTS.map((req, i) => (
              <motion.div
                key={i}
                className="flex items-start gap-3"
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
              >
                <CheckCircle className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
                <p className="text-sm text-gray-700 leading-relaxed">{req}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Application Form ─────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row mx-auto max-w-7xl px-6 pb-20 gap-10">
        <div className="flex-1">
          <MultiStepForm />
        </div>
        <div className="hidden md:flex flex-1 items-center justify-center relative overflow-hidden max-w-sm">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.img
              key={currentIndex}
              src={images[currentIndex]}
              alt="Instructor illustration"
              variants={imgVariants}
              initial="enter"
              animate="center"
              exit="exit"
              custom={direction}
              className="max-w-full"
            />
          </AnimatePresence>
        </div>
      </div>

      {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
      <div className="bg-[#fffaf4] pb-16 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl rounded-2xl border border-orange-100 bg-white p-8 text-center shadow-sm"
        >
          <h3 className="text-xl font-bold text-gray-900">Have Questions?</h3>
          <p className="mt-2 text-sm text-gray-500">
            Get in touch with our team to learn more about teaching opportunities at{" "}
            <span className="font-semibold text-gray-700">DUNAMIS</span>.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <a
              href="/contact-us"
              className="rounded-full bg-[#FF6B35] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#ff4400] transition-colors"
            >
              Contact Us
            </a>
            <a
              href="mailto:careers@dunamis.in"
              className="rounded-full border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-700 hover:border-orange-300 hover:text-orange-600 transition-colors"
            >
              careers@dunamis.in
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
