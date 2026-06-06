"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle } from "lucide-react";
import { fetchPublicSiteContent } from "@/lib/siteContent";

const FAQPage = () => {
  const [openIndex, setOpenIndex] = useState(null);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadFaqs = async () => {
      try {
        setLoading(true);
        const items = await fetchPublicSiteContent("faq");
        if (mounted) {
          setFaqs(items);
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

    loadFaqs();

    return () => {
      mounted = false;
    };
  }, []);

  const groupedFaqs = useMemo(() => {
    return faqs.reduce((groups, item) => {
      const category = item.category || "General";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
      return groups;
    }, {});
  }, [faqs]);

  const toggleFAQ = (id) => {
    setOpenIndex(openIndex === id ? null : id);
  };

  return (
    <div className="bg-[#fffaf4]">

      {/* ── Dark Hero ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-[#09090f] py-28 px-6 rounded-b-[52px]">
        <div className="orb absolute -top-32 -left-20 w-96 h-96 bg-orange-500/18" style={{ "--dur": "14s" }} />
        <div className="orb absolute top-10 right-0 w-80 h-80 bg-teal-500/12" style={{ "--dur": "18s", animationDelay: "5s" }} />

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-sm font-medium text-orange-400"
          >
            <HelpCircle className="w-4 h-4" /> Get Answers
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mt-5 text-4xl md:text-6xl font-extrabold text-white leading-tight"
          >
            Frequently Asked{" "}
            <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              Questions
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-5 text-base text-white/60 max-w-2xl mx-auto"
          >
            Find answers to the most common questions about DUNAMIS courses, pricing, scheduling, and more.
          </motion.p>
        </div>

      </div>

    <section className="py-16">
      <div className="max-w-5xl mx-auto px-6">

        {loading && (
          <p className="py-12 text-center text-gray-500">Loading FAQs...</p>
        )}

        {!loading && error && (
          <p className="py-12 text-center text-red-600">{error}</p>
        )}

        {!loading && !error && faqs.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center">
            <h3 className="text-lg font-semibold text-gray-900">
              FAQs are being updated
            </h3>
            <p className="mt-2 text-gray-600">
              Published FAQ answers will appear here once they are added from
              the admin dashboard.
            </p>
          </div>
        )}

        {!loading &&
          !error &&
          Object.entries(groupedFaqs).map(([category, items], secIndex) => (
            <div key={category} className="mb-12">
              <h3 className="text-2xl font-semibold mb-6 text-gray-800 border-l-4 border-[#47c9c4] pl-3">
                {category}
              </h3>
              <div className="space-y-4">
                {items.map((faq, index) => {
                  const id = `${secIndex}-${index}`;
                  const isOpen = openIndex === id;
                  return (
                    <motion.div
                      key={faq._id || id}
                      className="bg-white/70 backdrop-blur-md shadow-md rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:scale-[1.01] transition-all"
                      whileHover={{ y: -2 }}
                    >
                      <button
                        onClick={() => toggleFAQ(id)}
                        className="w-full flex justify-between items-center p-5 text-left font-medium text-gray-800"
                      >
                        <span>{faq.title}</span>
                        <motion.span
                          initial={false}
                          animate={{ rotate: isOpen ? 45 : 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="ml-4 flex-shrink-0 text-[#47c9c4] text-2xl"
                        >
                          +
                        </motion.span>
                      </button>

                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0, y: -10 }}
                            animate={{ opacity: 1, height: "auto", y: 0 }}
                            exit={{ opacity: 0, height: 0, y: -10 }}
                            transition={{ duration: 0.4, ease: "easeInOut" }}
                            className="px-5 pb-5 text-gray-600 leading-relaxed"
                          >
                            {faq.body}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
      </div>
    </section>
    </div>
  );
};

export default FAQPage;
