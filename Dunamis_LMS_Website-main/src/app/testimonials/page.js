"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { LuStar, LuQuote, LuMessageCircle } from "react-icons/lu";
import Link from "next/link";
import { fetchPublicSiteContent } from "@/lib/siteContent";
import { getInitialsImage, resolveImageUrl } from "@/lib/resolveImageUrl";

function CardSkeleton() {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm animate-pulse">
      <div className="flex gap-1 mb-4">
        {[1,2,3,4,5].map(i => <div key={i} className="w-4 h-4 rounded bg-gray-200" />)}
      </div>
      <div className="w-8 h-8 bg-gray-200 rounded mb-3" />
      <div className="space-y-2 mb-6">
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-5/6" />
        <div className="h-3 bg-gray-100 rounded w-4/6" />
      </div>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-200" />
        <div className="space-y-1.5">
          <div className="h-3 bg-gray-200 rounded w-24" />
          <div className="h-2.5 bg-gray-100 rounded w-16" />
        </div>
      </div>
    </div>
  );
}

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const items = await fetchPublicSiteContent("testimonial");
        if (mounted) { setTestimonials(items); setError(""); }
      } catch (err) {
        if (mounted) setError(err.response?.data?.message || err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const averageRating = useMemo(() => {
    if (!testimonials.length) return 0;
    const total = testimonials.reduce((sum, t) => sum + (Number(t.rating) || 0), 0);
    return (total / testimonials.length).toFixed(1);
  }, [testimonials]);

  return (
    <div className="bg-[#fffaf4]">

      {/* ── Dark Hero ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-[#09090f] py-28 px-6 rounded-b-[52px]">
        <div className="orb absolute -top-32 -left-20 w-96 h-96 bg-pink-500/15" style={{ "--dur": "14s" }} />
        <div className="orb absolute top-10 right-0 w-80 h-80 bg-purple-600/12" style={{ "--dur": "18s", animationDelay: "5s" }} />

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-sm font-medium text-orange-400"
          >
            <LuMessageCircle className="w-4 h-4" /> Hear From Our Students
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mt-5 text-4xl md:text-6xl font-extrabold text-white leading-tight"
          >
            Student{" "}
            <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              Reviews
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-5 text-base text-white/60 max-w-2xl mx-auto"
          >
            Discover what our students have to say about their learning journey at DUNAMIS.
          </motion.p>

          {/* Stats pills — only when data loaded */}
          {!loading && testimonials.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35 }}
              className="mt-10 flex flex-wrap justify-center gap-4"
            >
              <div className="flex flex-col items-center gap-1 rounded-2xl border border-white/10 bg-white/8 backdrop-blur-sm px-8 py-5">
                <span className="text-3xl font-extrabold text-orange-400">{testimonials.length}</span>
                <span className="text-sm text-white/60">Published Reviews</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-2xl border border-white/10 bg-white/8 backdrop-blur-sm px-8 py-5">
                <span className="text-3xl font-extrabold text-orange-400">{averageRating} ★</span>
                <span className="text-sm text-white/60">Average Rating</span>
              </div>
            </motion.div>
          )}
        </div>

      </div>

      {/* ── Reviews Grid ─────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-6 py-16">

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        )}

        {!loading && error && (
          <p className="py-12 text-center text-red-600">{error}</p>
        )}

        {!loading && !error && testimonials.length === 0 && (
          <div className="mx-auto max-w-2xl rounded-2xl border border-dashed border-gray-300 p-10 text-center">
            <LuQuote className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900">Reviews are being updated</h3>
            <p className="mt-2 text-gray-500">Published reviews will appear here once added.</p>
          </div>
        )}

        {!loading && !error && testimonials.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {testimonials.map((item, i) => {
              const rating = Math.max(0, Math.min(5, Math.round(item.rating || 5)));
              return (
                <motion.div
                  key={item._id || i}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.45, delay: (i % 3) * 0.08 }}
                  whileHover={{ y: -4 }}
                  className="flex flex-col rounded-2xl bg-white border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all duration-300"
                >
                  {/* Stars */}
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <LuStar
                        key={idx}
                        className={`w-4 h-4 ${idx < rating ? "fill-orange-400 text-orange-400" : "text-gray-200"}`}
                      />
                    ))}
                  </div>

                  {/* Quote mark */}
                  <LuQuote className="w-7 h-7 text-orange-400/60 mb-3" />

                  {/* Review body */}
                  <p className="flex-1 text-sm text-gray-600 leading-relaxed mb-6">
                    &ldquo;{item.body}&rdquo;
                  </p>

                  {/* Author */}
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-50">
                    <img
                      src={resolveImageUrl(item.image, getInitialsImage(item.title))}
                      alt={item.title}
                      className="w-10 h-10 rounded-full object-cover object-top"
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-500">{item.subtitle}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <div className="px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-4xl rounded-3xl bg-gradient-to-br from-[#FF6B35] to-[#c84400] p-10 text-center text-white"
        >
          <h3 className="text-2xl md:text-3xl font-bold">Join Our Community of Learners</h3>
          <p className="mt-3 text-white/80 max-w-xl mx-auto">
            Start your own success story with DUNAMIS.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/courses" className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-orange-600 hover:bg-orange-50 transition-colors">
              Explore Courses
            </Link>
            <Link href="/contact-us" className="rounded-full border-2 border-white/50 px-7 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors">
              Contact Us
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
