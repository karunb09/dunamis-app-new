"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { fetchPublicSiteContent } from "@/lib/siteContent";
import { getInitialsImage, resolveImageUrl } from "@/lib/resolveImageUrl";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.25 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut", delay: i * 0.1 },
  }),
};

const textVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, delay: 0.1 } },
};

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadReviews = async () => {
      try {
        setLoading(true);
        const items = await fetchPublicSiteContent("testimonial");
        if (mounted) {
          setTestimonials(items);
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

    loadReviews();

    return () => {
      mounted = false;
    };
  }, []);

  const averageRating = useMemo(() => {
    if (!testimonials.length) return 0;
    const total = testimonials.reduce(
      (sum, item) => sum + (Number(item.rating) || 0),
      0
    );
    return (total / testimonials.length).toFixed(1);
  }, [testimonials]);

  return (
    <section className="bg-white px-6 py-20">
      <motion.div
        className="text-center mb-16"
        initial={{ opacity: 0, y: -10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false }}
        transition={{ duration: 0.5 }}
      >
        <p className="text-[#47c9c4] font-medium mb-2">
          Hear from our students
        </p>
        <h2 className="text-2xl sm:text-3xl md:text-3xl font-extrabold mb-2">
          Student Reviews
        </h2>
        <p className="text-gray-600 mt-2 max-w-2xl mx-auto text-xl">
          Discover what our students have to say about their learning journey
          at DUNAMIS.
        </p>
      </motion.div>

      {!loading && !error && testimonials.length > 0 && (
        <section className="md:grid-cols-3 gap-6 px-2 md:px-12 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center mb-12 max-w-xl mx-auto">
            <div className="bg-cyan-50 rounded-xl shadow-md flex flex-col items-center justify-center px-6 py-4">
              <h3 className="text-3xl font-bold text-orange-600">
                {testimonials.length}
              </h3>
              <p className="text-gray-600 text-sm md:text-base mt-1">
                Published Reviews
              </p>
            </div>

            <div className="bg-orange-50 rounded-xl shadow-md flex flex-col items-center justify-center px-6 py-4">
              <h3 className="text-3xl font-bold text-[#47c9c4]">
                {averageRating}
              </h3>
              <p className="text-gray-600 text-sm md:text-base mt-1">
                Average Rating
              </p>
            </div>
          </div>
        </section>
      )}

      {loading && (
        <p className="py-12 text-center text-gray-500">
          Loading reviews...
        </p>
      )}

      {!loading && error && (
        <p className="py-12 text-center text-red-600">{error}</p>
      )}

      {!loading && !error && testimonials.length === 0 && (
        <div className="mx-auto max-w-2xl rounded-2xl border border-dashed border-gray-300 p-10 text-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Reviews are being updated
          </h3>
          <p className="mt-2 text-gray-600">
            Published reviews will appear here once they are added from
            the admin dashboard.
          </p>
        </div>
      )}

      {!loading && !error && testimonials.length > 0 && (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.2 }}
        >
          {testimonials.map((item, i) => {
            const rating = Math.max(0, Math.min(5, Math.round(item.rating || 5)));
            return (
              <motion.div
                key={item._id || i}
                whileHover={{ rotateY: 8, rotateX: -5, scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="p-6 rounded-2xl shadow-md border border-gray-200 bg-white"
                variants={cardVariants}
                custom={i}
              >
                <div className="flex text-pink-600 mb-3">
                  {Array.from({ length: rating }).map((_, idx) => (
                    <Star key={idx} className="w-5 h-5 fill-pink-600" />
                  ))}
                </div>
                <motion.div variants={textVariants}>
                  <Quote className="w-7 h-7 md:w-8 md:h-8 text-cyan-500 mb-3" />
                </motion.div>
                <motion.p
                  className="text-gray-700 leading-relaxed mb-6 text-sm md:text-base"
                  variants={textVariants}
                >
                  "{item.body}"
                </motion.p>
                <div className="flex items-center space-x-3">
                  <img
                    src={resolveImageUrl(item.image, getInitialsImage(item.title))}
                    alt={item.title}
                    className="w-12 h-12 rounded-full object-cover object-top"
                  />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm md:text-base">
                      {item.title}
                    </p>
                    <p className="text-gray-600 text-xs md:text-sm">
                      {item.subtitle}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      <motion.div
        className="mt-16 w-11/12 mx-auto bg-gradient-to-br from-[#47c9c4] via-[#c3b091] to-[#fc6d3f] py-12 px-6 md:px-20 text-center rounded-2xl shadow-lg flex flex-col items-center"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.3 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <h2 className="text-xl sm:text-2xl md:text-2xl text-white font-bold mb-4">
          Join Our Community of Learners
        </h2>
        <p className="mb-6 max-w-2xl text-sm md:text-base text-white">
          Start your own success story with DUNAMIS.
        </p>
      </motion.div>
    </section>
  );
}
