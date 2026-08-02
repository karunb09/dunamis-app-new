"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { FiTarget, FiEye, FiBook, FiUsers, FiStar, FiTrendingUp } from "react-icons/fi";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const TIMELINE = [
  {
    year: "2020",
    title: "The Beginning",
    body: "Dunamis School of Music was born during the 2020 pandemic lockdown — a small online initiative designed to provide affordable, high-quality creative education at a time when connection and creativity were more important than ever.",
    color: "#FF6B35",
  },
  {
    year: "2024",
    title: "Expansion & Establishment",
    body: "Dunamis officially became a private limited company and expanded to new cities across India. With physical centres and a growing presence in communities, we began offering diverse programmes in music, dance, and more.",
    color: "#47c9c4",
  },
  {
    year: "2025",
    title: "Digital Transformation",
    body: "We launched our dedicated digital learning platform, making creative education even more accessible. By reaching learners through the internet, Dunamis continues to grow its impact across the country and beyond.",
    color: "#a855f7",
  },
];

const VALUES = [
  {
    icon: FiUsers,
    label: "Community",
    body: "Building connections and fostering a supportive environment where everyone belongs.",
    color: "#3b82f6",
  },
  {
    icon: FiStar,
    label: "Excellence",
    body: "Maintaining the highest standards in education while making learning enjoyable and accessible.",
    color: "#eab308",
  },
  {
    icon: FiTrendingUp,
    label: "Growth",
    body: "Encouraging personal development and artistic expression at every level of learning.",
    color: "#22c55e",
  },
];

export default function About() {
  return (
    <div className="bg-[#fffaf4] text-gray-800">

      {/* ── Dark Hero ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-[#09090f] py-28 px-6 rounded-b-[52px]">
        <div className="orb absolute -top-32 -left-32 w-96 h-96 bg-orange-500/18" style={{ "--dur": "14s" }} />
        <div className="orb absolute top-10 right-0 w-80 h-80 bg-purple-600/12" style={{ "--dur": "18s", animationDelay: "4s" }} />
        <div className="orb absolute bottom-0 left-1/3 w-72 h-72 bg-teal-500/10" style={{ "--dur": "22s", animationDelay: "8s" }} />

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <span
            className="fade-in-up inline-block rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-sm font-medium text-orange-400"
            style={{ "--fade-y": "12px", "--fade-dur": "0.6s" }}
          >
            Our Story
          </span>
          <h1
            className="fade-in-up mt-5 text-4xl md:text-6xl font-extrabold text-white leading-tight"
            style={{ "--fade-y": "24px", "--fade-dur": "0.7s", "--fade-delay": "0.1s" }}
          >
            About{" "}
            <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              DUNAMIS
            </span>
          </h1>
          <p
            className="fade-in-up mt-5 text-base text-white/60 max-w-2xl mx-auto leading-relaxed"
            style={{ "--fade-y": "16px", "--fade-dur": "0.7s", "--fade-delay": "0.2s" }}
          >
            More than just an institute — Dunamis is a vibrant learning community
            where creativity is nurtured, confidence is built, and every individual
            is encouraged to express, explore, and grow.
          </p>
        </div>

      </div>

      {/* ── Story / Mission / Vision ──────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: FiBook,
              label: "Our Story",
              body: "Dunamis is a vibrant learning community where creativity is nurtured, confidence is built, and every individual is encouraged to express, explore, and grow.",
              accent: "#FF6B35",
              bg: "from-orange-500/10 to-orange-600/5",
              border: "border-orange-500/20",
            },
            {
              icon: FiTarget,
              label: "Our Mission",
              body: "To provide exceptional creative education that nurtures talent, builds confidence, and creates a supportive community where every individual can discover and develop their artistic potential.",
              accent: "#22c55e",
              bg: "from-emerald-500/10 to-emerald-600/5",
              border: "border-emerald-500/20",
            },
            {
              icon: FiEye,
              label: "Our Vision",
              body: "To be the leading platform for creative education, making high-quality artistic training accessible to everyone, everywhere, while fostering a global community of passionate learners and creators.",
              accent: "#a855f7",
              bg: "from-purple-500/10 to-purple-600/5",
              border: "border-purple-500/20",
            },
          ].map(({ icon: Icon, label, body, accent, bg, border }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.55, delay: i * 0.1 }}
              className={`rounded-2xl border ${border} bg-gradient-to-br ${bg} p-6 backdrop-blur-sm`}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl mb-4" style={{ background: `${accent}18` }}>
                <Icon className="w-5 h-5" style={{ color: accent }} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{label}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Journey Timeline — dark section ──────────────────────────────── */}
      <div className="relative overflow-hidden bg-[#0d0d1a] py-24 px-6 rounded-[52px] mx-4 md:mx-8">
        <div className="orb absolute top-0 right-0 w-96 h-96 bg-orange-500/10" style={{ "--dur": "20s" }} />

        <div className="relative z-10 mx-auto max-w-3xl">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl font-bold text-white text-center mb-16"
          >
            Our{" "}
            <span className="bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">
              Journey
            </span>
          </motion.h2>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-white/10" />

            <div className="space-y-12">
              {TIMELINE.map(({ year, title, body, color }, i) => (
                <motion.div
                  key={year}
                  initial={{ opacity: 0, x: -24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.55, delay: i * 0.1 }}
                  className="relative pl-16"
                >
                  {/* Timeline dot */}
                  <div
                    className="absolute left-2.5 top-1.5 h-5 w-5 rounded-full border-2 border-[#0d0d1a]"
                    style={{ background: color, boxShadow: `0 0 12px 2px ${color}50` }}
                  />
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color }}>
                    {year}
                  </span>
                  <h3 className="mt-1 text-xl font-bold text-white">{title}</h3>
                  <p className="mt-2 text-sm text-white/60 leading-relaxed">{body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ── Values ───────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-6 py-20">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="text-3xl font-bold text-center text-gray-900 mb-12"
        >
          Our Values
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {VALUES.map(({ icon: Icon, label, body, color }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="flex flex-col items-center text-center p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl mb-4" style={{ background: `${color}15` }}>
                <Icon className="w-7 h-7" style={{ color }} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{label}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <div className="px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-4xl rounded-3xl bg-gradient-to-br from-[#FF6B35] via-[#e05a25] to-[#c84400] p-10 text-center text-white"
        >
          <h3 className="text-2xl md:text-3xl font-bold">Join Our Community</h3>
          <p className="mt-3 text-white/80 max-w-xl mx-auto">
            Be part of a community that believes in the transformative power of creative education.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/courses"
              className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-orange-600 hover:bg-orange-50 transition-colors"
            >
              Explore Courses
            </Link>
            <Link
              href="/contact-us"
              className="rounded-full border-2 border-white/50 px-7 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            >
              Get In Touch
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
