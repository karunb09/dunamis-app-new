"use client";
import { motion } from "framer-motion";
import { FaMusic, FaLanguage } from "react-icons/fa";
import { GiMusicalNotes } from "react-icons/gi";

const offerings = [
  {
    icon: <FaMusic size={28} />,
    label: "Music",
    color: "#A259FF",
    description:
      "Find your voice and master instruments, from Carnatic vocals to contemporary guitar, with expert guidance.",
    glow: "rgba(162,89,255,0.35)",
    border: "rgba(162,89,255,0.35)",
    bg: "rgba(162,89,255,0.08)",
  },
  {
    icon: <GiMusicalNotes size={28} />,
    label: "Dance",
    color: "#FF6F61",
    description:
      "Explore a diverse range of dance styles from Zumba to Bharatanatyam that move your body and spirit.",
    glow: "rgba(255,111,97,0.35)",
    border: "rgba(255,111,97,0.35)",
    bg: "rgba(255,111,97,0.08)",
  },
  {
    icon: <FaLanguage size={28} />,
    label: "Languages",
    color: "#47c9c4",
    description:
      "Learn new cultures and languages, classes that help you express yourself fluently and fearlessly.",
    glow: "rgba(71,201,196,0.35)",
    border: "rgba(71,201,196,0.35)",
    bg: "rgba(71,201,196,0.08)",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};

export default function Offerings() {
  return (
    <section className="relative overflow-hidden bg-[#0D0D18] py-24 px-6">
      {/* Background gradient orbs */}
      <div
        className="orb w-[420px] h-[420px] left-[-10%] top-[-10%] opacity-30"
        style={{ background: "#A259FF", "--dur": "14s" }}
      />
      <div
        className="orb w-[360px] h-[360px] right-[-8%] top-[30%] opacity-25"
        style={{ background: "#FF6F61", "--dur": "11s", animationDelay: "3s" }}
      />
      <div
        className="orb w-[300px] h-[300px] left-[35%] bottom-[-10%] opacity-20"
        style={{ background: "#47c9c4", "--dur": "16s", animationDelay: "6s" }}
      />

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: -30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true, amount: 0.05 }}
        >
          <span className="inline-block mb-4 rounded-full bg-white/10 border border-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-white/60 backdrop-blur-sm">
            What We Offer
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight">
            Explore Your{" "}
            <span className="bg-gradient-to-r from-[#ef6a32] via-[#ff9a5c] to-[#47c9c4] bg-clip-text text-transparent">
              Creative Path
            </span>
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-white/50 text-sm sm:text-base">
            Three worlds of artistry — find the one that sets your soul on fire.
          </p>
        </motion.div>

        {/* Cards */}
        <motion.div
          className="grid md:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.05 }}
        >
          {offerings.map((item) => (
            <motion.div
              key={item.label}
              variants={cardVariants}
              whileHover={{
                y: -8,
                boxShadow: `0 0 48px -10px ${item.glow}`,
              }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="group relative flex flex-col rounded-2xl p-7 backdrop-blur-sm cursor-default"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: `1.5px solid ${item.border}`,
              }}
            >
              {/* Icon */}
              <div
                className="mb-5 inline-flex w-fit items-center justify-center rounded-xl p-3"
                style={{ background: item.bg, border: `1px solid ${item.border}`, color: item.color }}
              >
                {item.icon}
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold mb-3" style={{ color: item.color }}>
                {item.label}
              </h3>
              <p className="text-white/55 text-sm leading-relaxed">{item.description}</p>

              {/* Bottom accent line */}
              <div
                className="mt-6 h-px w-full opacity-30 group-hover:opacity-70 transition-opacity duration-300"
                style={{ background: `linear-gradient(to right, ${item.color}, transparent)` }}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
