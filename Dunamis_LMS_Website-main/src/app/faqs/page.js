"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
    <section className="py-20">
      <div className="max-w-5xl mx-auto px-6">
        <motion.h4 className="text-[#FF6B35] font-medium mb-2 flex items-center justify-center">
          Get Answer
        </motion.h4>
        <motion.h2
          className="text-2xl sm:text-3xl md:text-3xl font-bold mt-2 text-[#2D2D2D] text-center mb-4"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: false }}
        >
          Frequently Asked Questions
        </motion.h2>

        <motion.p
          className="text-center text-xl text-gray-600 mb-16 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: false }}
        >
          Find answers to the most common questions about DUNAMIS courses,
          pricing, scheduling, and more.
        </motion.p>

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
  );
};

export default FAQPage;
