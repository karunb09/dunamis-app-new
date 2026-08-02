"use client";
import { motion } from "framer-motion";
import { LuStar } from "react-icons/lu";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import FilterQuestionsModal from "@/components/PopupModals/FilterQuestionsModal";
import { fetchPublicSiteContent } from "@/lib/siteContent";
import { getInitialsImage, resolveImageUrl } from "@/lib/resolveImageUrl";

function TestimonialCard({ item, index }) {
  const stars = Math.round(item.rating || 5);
  return (
    <div
      className="shrink-0 w-[300px] sm:w-[340px] rounded-2xl p-5 flex flex-col gap-3"
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Large quote mark */}
      <span className="text-4xl font-serif leading-none text-[#CC3700]/70 select-none">"</span>

      {/* Stars */}
      <div className="flex gap-0.5">
        {[...Array(stars)].map((_, i) => (
          <LuStar key={i} className="h-3.5 w-3.5 fill-[#ef6a32] text-[#CC3700]" />
        ))}
      </div>

      {/* Body */}
      <p className="text-white/65 text-sm leading-relaxed line-clamp-4">{item.body}</p>

      {/* Author */}
      <div className="mt-auto flex items-center gap-3 pt-3 border-t border-white/10">
        <img
          src={resolveImageUrl(item.image, getInitialsImage(item.title))}
          alt={item.title}
          className="h-9 w-9 rounded-full object-cover object-top shrink-0"
          loading="lazy"
          decoding="async"
        />
        <div>
          <p className="text-white text-sm font-semibold leading-tight">{item.title}</p>
          <p className="text-white/45 text-xs">{item.subtitle}</p>
        </div>
      </div>
    </div>
  );
}

export default function Testimonials() {
  const router = useRouter();
  const [isInterestModalOpen, setInterestModalOpen] = useState(false);
  const [testimonials, setTestimonials] = useState([]);

  useEffect(() => {
    let mounted = true;
    fetchPublicSiteContent("testimonial")
      .then((items) => { if (mounted) setTestimonials(items || []); })
      .catch(() => { if (mounted) setTestimonials([]); });
    return () => { mounted = false; };
  }, []);

  // Split into two rows; fall back to single array duplicated if very few items
  const row1 = testimonials.length >= 4
    ? testimonials.slice(0, Math.ceil(testimonials.length / 2))
    : testimonials;
  const row2 = testimonials.length >= 4
    ? testimonials.slice(Math.ceil(testimonials.length / 2))
    : [...testimonials].reverse();

  // Ensure we have enough cards to fill the scroll — duplicate until ≥ 4 items per row
  const pad = (arr) => {
    if (arr.length === 0) return [];
    let out = [...arr];
    while (out.length < 4) out = [...out, ...arr];
    return out;
  };

  const r1 = pad(row1);
  const r2 = pad(row2);

  return (
    <div>
      {/* ── Infinite Scroll Reviews ─────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0a0a16] via-[#0f0f22] to-[#0a0a16] py-24">
        {/* Background orbs */}
        <div
          className="orb w-[500px] h-[500px] left-[-15%] top-[-20%] opacity-20"
          style={{ background: "#ef6a32", "--dur": "18s" }}
        />
        <div
          className="orb w-[400px] h-[400px] right-[-10%] bottom-[-15%] opacity-15"
          style={{ background: "#47c9c4", "--dur": "14s", animationDelay: "4s" }}
        />

        <div className="relative z-10">
          {/* Header */}
          <motion.div
            className="text-center mb-14 px-6"
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true, amount: 0.05 }}
          >
            <span className="inline-block mb-4 rounded-full bg-white/10 border border-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-white/60 backdrop-blur-sm">
              Student Reviews
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
              What Our{" "}
              <span className="bg-gradient-to-r from-[#ef6a32] to-[#47c9c4] bg-clip-text text-transparent">
                Students Say
              </span>
            </h2>
            <p className="mt-4 text-white/45 max-w-xl mx-auto text-sm sm:text-base">
              Join thousands who have discovered their creative potential with Dunamis.
            </p>
          </motion.div>

          {testimonials.length === 0 ? (
            <p className="text-center text-white/40 py-10">Student stories are being updated.</p>
          ) : (
            <div className="flex flex-col gap-5 overflow-hidden">
              {/* Row 1 — scrolls left */}
              <div className="flex gap-5 testimonial-track testimonial-track-left px-5">
                {[...r1, ...r1].map((item, i) => (
                  <TestimonialCard key={`r1-${i}`} item={item} index={i} />
                ))}
              </div>
              {/* Row 2 — scrolls right */}
              <div className="flex gap-5 testimonial-track testimonial-track-right px-5">
                {[...r2, ...r2].map((item, i) => (
                  <TestimonialCard key={`r2-${i}`} item={item} index={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── CTA Section ─────────────────────────────── */}
      <motion.section
        className="relative overflow-hidden py-24 px-6 text-center"
        style={{
          background: "linear-gradient(135deg, #0f0f1a 0%, #1a0f06 40%, #0a1a18 100%)",
        }}
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        viewport={{ once: true, amount: 0.05 }}
      >
        {/* Glow accents */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/4 top-0 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#CC3700]/20 blur-3xl" />
          <div className="absolute right-1/4 bottom-0 h-48 w-48 translate-x-1/2 translate-y-1/2 rounded-full bg-[#237673]/20 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">
            Ready to Begin Your{" "}
            <span className="bg-gradient-to-r from-[#ef6a32] to-[#47c9c4] bg-clip-text text-transparent">
              Creative Journey?
            </span>
          </h2>
          <p className="text-white/50 text-sm sm:text-base max-w-lg mx-auto mb-10">
            Join our vibrant community of learners and discover your potential.
            Whether online or at our centres, your creative adventure starts here.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <motion.button
              whileHover={{ scale: 1.06, boxShadow: "0 16px 36px -10px rgba(239,106,50,0.6)" }}
              whileTap={{ scale: 0.96 }}
              onClick={() => router.push("/courses")}
              className="cursor-pointer rounded-full bg-[#CC3700] border border-[#CC3700] px-7 py-2.5 text-sm font-semibold text-white transition-all duration-200"
            >
              Explore All Courses
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setInterestModalOpen(true)}
              className="cursor-pointer rounded-full border border-[#237673]/60 px-7 py-2.5 text-sm font-semibold text-[#237673] backdrop-blur-sm transition-all duration-200 hover:bg-[#237673]/10"
            >
              Book a Demo
            </motion.button>
          </div>
        </div>
      </motion.section>

      <FilterQuestionsModal
        isOpen={isInterestModalOpen}
        onClose={() => setInterestModalOpen(false)}
      />
    </div>
  );
}
