"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Sparkles, Play } from "lucide-react";
import { fetchPublicSiteContent } from "@/lib/siteContent";
import { getInitialsImage, resolveImageUrl } from "@/lib/resolveImageUrl";

const getYoutubeUrl = (value) => {
  const url = String(value || "").trim();
  return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(url) ? url : "";
};

function CardSkeleton() {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 overflow-hidden shadow-sm animate-pulse">
      <div className="h-52 bg-gray-200" />
      <div className="p-5 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-5/6" />
      </div>
    </div>
  );
}

export default function SuccessStories() {
  const router = useRouter();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const items = await fetchPublicSiteContent("successStory");
        if (mounted) { setStories(items); setError(""); }
      } catch (err) {
        if (mounted) setError(err.response?.data?.message || err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="bg-[#fffaf4]">

      {/* ── Dark Hero ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-[#09090f] py-28 px-6 rounded-b-[52px]">
        <div className="orb absolute -top-32 -left-24 w-[400px] h-[400px] bg-orange-500/18" style={{ "--dur": "15s" }} />
        <div className="orb absolute top-0 right-0 w-80 h-80 bg-purple-600/12" style={{ "--dur": "19s", animationDelay: "6s" }} />

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-sm font-medium text-orange-400"
          >
            <Sparkles className="w-4 h-4" /> Celebrating Journeys
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mt-5 text-4xl md:text-6xl font-extrabold text-white leading-tight"
          >
            Success{" "}
            <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              Stories
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-5 text-base text-white/60 max-w-2xl mx-auto"
          >
            Inspiring journeys of students who have achieved meaningful milestones with DUNAMIS.
          </motion.p>
        </div>

      </div>

      {/* ── Stories Grid ─────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-6 py-16">

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        )}

        {!loading && error && (
          <p className="py-12 text-center text-red-600">{error}</p>
        )}

        {!loading && !error && stories.length === 0 && (
          <div className="mx-auto max-w-2xl rounded-2xl border border-dashed border-gray-300 p-10 text-center">
            <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900">Stories are being updated</h3>
            <p className="mt-2 text-gray-500">Published stories will appear here once added.</p>
          </div>
        )}

        {!loading && !error && stories.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {stories.map((story, i) => {
              const youtubeUrl =
                getYoutubeUrl(story.youtubeUrl) || getYoutubeUrl(story.subtitle);

              return (
                <motion.div
                  key={story._id || i}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.45, delay: (i % 3) * 0.09 }}
                  whileHover={{ y: -4 }}
                  className="group flex flex-col rounded-2xl bg-white border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
                >
                  {/* Card image */}
                  <div className="relative h-52 overflow-hidden">
                    <img
                      src={resolveImageUrl(story.image, getInitialsImage(story.title))}
                      alt={story.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                    {/* YouTube play overlay */}
                    {youtubeUrl && (
                      <a
                        href={youtubeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute inset-0 flex items-center justify-center"
                        aria-label="Watch on YouTube"
                      >
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600/90 backdrop-blur-sm border-2 border-white/30 shadow-lg transition-transform group-hover:scale-110">
                          <Play className="w-6 h-6 text-white fill-white ml-1" />
                        </div>
                      </a>
                    )}

                    {/* Name overlaid on image */}
                    <h3 className="absolute bottom-3 left-4 right-4 text-base font-bold text-white drop-shadow line-clamp-1">
                      {story.title}
                    </h3>
                  </div>

                  {/* Body */}
                  <div className="flex flex-1 flex-col p-5">
                    {youtubeUrl && !story.body && (
                      <a
                        href={youtubeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:underline"
                      >
                        <Play className="w-3.5 h-3.5 fill-red-600" /> Watch on YouTube
                      </a>
                    )}
                    <p className="flex-1 text-sm text-gray-600 leading-relaxed line-clamp-4">
                      {story.body}
                    </p>
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
          className="mx-auto max-w-4xl rounded-3xl border border-orange-100 bg-white p-10 text-center shadow-sm"
        >
          <h3 className="text-2xl font-bold text-gray-900">Your Success Story Starts Here</h3>
          <p className="mt-3 text-gray-500 max-w-xl mx-auto">
            Join our community and build toward your own creative goals.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => router.push("/courses")}
              className="rounded-full bg-[#FF6B35] px-7 py-3 text-sm font-semibold text-white hover:bg-[#ff4400] transition-colors"
            >
              Start Your Journey
            </button>
            <button
              onClick={() => router.push("/contact-us")}
              className="rounded-full border border-gray-200 px-7 py-3 text-sm font-semibold text-gray-700 hover:border-orange-300 hover:text-orange-600 transition-colors"
            >
              Share Your Story
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
