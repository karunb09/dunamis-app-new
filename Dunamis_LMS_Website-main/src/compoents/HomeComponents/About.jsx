"use client";
import { motion } from "framer-motion";

export default function About() {
  return (
    <section className="dot-grid relative bg-[#F5F5F5] px-4 sm:px-6 md:px-8 pb-16">
      {/* Decorative music note */}
      <div
        className="pointer-events-none absolute right-6 top-6 select-none text-[200px] font-bold leading-none opacity-[0.04] text-slate-800"
        aria-hidden
      >
        ♫
      </div>

      <div className="relative z-10 max-w-7xl mx-auto pt-14">
        {/* Tagline */}
        <motion.p
          className="text-[10px] sm:text-xs text-[#FF6B35] mb-2 uppercase tracking-wide text-center sm:text-left"
          initial={{ opacity: 0, y: -30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true, amount: 0.05 }}
        >
          Listed As The Best Learning Platform 2025
        </motion.p>

        {/* Heading */}
        <motion.h2
          className="text-xl sm:text-2xl md:text-3xl font-bold text-[#2D2D2D] mb-4 text-center sm:text-left"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true, amount: 0.05 }}
        >
          What is Dunamis?
        </motion.h2>

        {/* Paragraph */}
        <motion.p
          className="text-sm sm:text-base text-[#2D2D2D] leading-relaxed text-justify sm:text-left max-w-3xl"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true, amount: 0.05 }}
        >
          Dunamis is more than just an institute. It's a vibrant community built
          on the belief that everyone deserves a space to express, explore, and
          evolve. What began as the Dunamis School of Music, a one-stop
          destination for music education, concerts, evening programs, and
          workshops has now grown into a multidisciplinary platform for music,
          movement, and the fine arts.
          <br />
          <br />
          Here, learning goes beyond technique. It's about building confidence,
          community, and creativity with guidance from accomplished mentors who
          are passionate about sharing their craft.
        </motion.p>

      </div>
    </section>
  );
}
