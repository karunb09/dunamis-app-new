"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { fetchPublicSiteContent } from "@/lib/siteContent";
import { getInitialsImage, resolveImageUrl } from "@/lib/resolveImageUrl";

const getYoutubeUrl = (value) => {
  const url = String(value || "").trim();
  return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(url) ? url : "";
};

export default function SuccessStories() {
  const router = useRouter();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadStories = async () => {
      try {
        setLoading(true);
        const items = await fetchPublicSiteContent("successStory");
        if (mounted) {
          setStories(items);
          setError("");
        }
      } catch (err) {
        if (mounted) {
          setError(err.response?.data?.message || err.message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadStories();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="py-16">
      <div className="max-w-8xl mx-auto px-6 text-center">
        <motion.p
          className="text-[#FF6B35] font-medium"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: false }}
        >
          Celebrating journeys
        </motion.p>

        <motion.h1
          className="text-2xl sm:text-3xl md:text-3xl font-bold mt-2 text-[#2D2D2D]"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: false }}
        >
          Success Stories
        </motion.h1>

        <motion.p
          className="text-gray-600 mt-2 max-w-2xl mx-auto text-xl"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: false }}
        >
          Inspiring journeys of students who have achieved meaningful
          milestones with DUNAMIS.
        </motion.p>

        {loading && (
          <p className="py-12 text-center text-gray-500">
            Loading success stories...
          </p>
        )}

        {!loading && error && (
          <p className="py-12 text-center text-red-600">{error}</p>
        )}

        {!loading && !error && stories.length === 0 && (
          <div className="mx-auto mt-12 max-w-2xl rounded-2xl border border-dashed border-gray-300 p-10">
            <h3 className="text-lg font-semibold text-gray-900">
              Success stories are being updated
            </h3>
            <p className="mt-2 text-gray-600">
              Published stories will appear here once they are added from the
              admin dashboard.
            </p>
          </div>
        )}

        {!loading && !error && stories.length > 0 && (
          <div className="grid md:grid-cols-3 gap-8 mt-12 px-2 pl-10 pr-10">
            {stories.map((story, i) => {
              const youtubeUrl =
                getYoutubeUrl(story.youtubeUrl) || getYoutubeUrl(story.subtitle);

              return (
              <motion.div
                key={story._id || i}
                className="bg-white border rounded-2xl shadow-md hover:shadow-xl transition overflow-hidden flex flex-col"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: i * 0.2 }}
                viewport={{ once: false }}
              >
                <div className="relative h-48 w-full overflow-hidden">
                  <img
                    src={resolveImageUrl(story.image, getInitialsImage(story.title))}
                    alt={story.title}
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                  />
                </div>

                <div className="p-5 flex flex-col flex-grow text-left">
                  <h3 className="font-bold text-lg mt-2">{story.title}</h3>
                  {youtubeUrl && (
                    <a
                      href={youtubeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-orange-600 text-sm font-medium mb-2 hover:underline"
                    >
                      Watch on YouTube
                    </a>
                  )}
                  <p className="text-gray-600 text-sm flex-grow">{story.body}</p>
                </div>
              </motion.div>
              );
            })}
          </div>
        )}

        <motion.div
          className="mt-16 bg-orange-50 rounded-xl py-10 px-6"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: false }}
        >
          <h3 className="text-xl md:text-2xl font-bold">
            Your Success Story Starts Here
          </h3>
          <p className="text-gray-600 mt-2">
            Join our community and build toward your own creative goals.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 justify-center">
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => router.push("/courses")}
              className="cursor-pointer border border-orange-500 bg-orange-500 text-white transition-all duration-300 ease-in-out px-6 py-2 rounded-full"
            >
              Start Your Journey
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => router.push("/contact-us")}
              className="text-[#47c9c4] cursor-pointer border border-[#47c9c4] hover:text-white hover:bg-[#47c9c4] transition-all duration-300 ease-in-out px-6 py-2 rounded-full"
            >
              Share Your Story
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
