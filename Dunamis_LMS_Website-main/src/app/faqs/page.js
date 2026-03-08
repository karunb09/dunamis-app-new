"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const FAQPage = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFAQ = (id) => {
    setOpenIndex(openIndex === id ? null : id);
  };

  const faqData = [
    {
      category: "Getting Started",
      items: [
        {
          q: "How do I sign up for courses at DUNAMIS?",
          a: "You can sign up by clicking the 'Sign Up' button on our website and following the registration process. Once registered, you can browse and enroll in any of our courses. For assistance, contact our support team.",
        },
        {
          q: "Do you offer both online and offline classes?",
          a: "Yes! We offer both online and offline classes. Our offline centres are located in Mumbai, Bangalore, Delhi NCR, and Hyderabad. Online classes are available globally with live interactive sessions.",
        },
        {
          q: "What is the minimum age requirement for courses?",
          a: "We welcome learners of all ages! Our courses are designed for children (5+), teenagers, and adults. Each course has specific age recommendations mentioned in the course details.",
        },
      ],
    },
    {
      category: "Courses & Curriculum",
      items: [
        {
          q: "What courses do you offer?",
          a: "DUNAMIS offers music courses (Western & Carnatic vocals, guitar, piano, violin, drums, ukulele), dance (Zumba), and strategic games (chess). All courses are designed for beginners to advanced levels.",
        },
        {
          q: "Are your courses suitable for beginners?",
          a: "Absolutely! All our courses are beginner-friendly. Our instructors use a structured approach to help complete beginners learn step-by-step, building confidence and skills progressively.",
        },
        {
          q: "Do you prepare students for Trinity College London exams?",
          a: "Yes, we have specialized Trinity College London (TCL) preparation programs. Our instructors are experienced in TCL curriculum and have helped many students achieve excellent grades in their examinations.",
        },
      ],
    },
    {
      category: "Pricing & Payment",
      items: [
        {
          q: "What are your course fees?",
          a: "Most of our courses start from ₹1,800 per month. Pricing varies based on the course type, duration, and learning mode (online/offline). Check individual course pages for detailed pricing.",
        },
        {
          q: "Do you offer any discounts or scholarships?",
          a: "Yes, we offer early bird discounts, family packages, and need-based scholarships. We also have special rates for bulk enrollments and long-term commitments. Contact us for more details.",
        },
        {
          q: "What payment methods do you accept?",
          a: "We accept all major payment methods including credit/debit cards, UPI, net banking, and digital wallets. Monthly, quarterly, and annual payment plans are available.",
        },
      ],
    },
    {
      category: "Technical Support",
      items: [
        {
          q: "What equipment do I need for online classes?",
          a: "For online classes, you need a device with a stable internet connection, webcam, and microphone. For music courses, having the respective instrument is recommended but not mandatory for initial classes.",
        },
        {
          q: "What platform do you use for online classes?",
          a: "We use professional video conferencing platforms optimized for music education. Detailed instructions and technical support are provided to all students before their first class.",
        },
        {
          q: "What if I face technical issues during class?",
          a: "Our technical support team is available during class hours to assist with any issues. We also provide makeup classes if technical problems prevent you from attending your scheduled session.",
        },
      ],
    },
    {
      category: "Scheduling & Attendance",
      items: [
        {
          q: "Can I reschedule my classes?",
          a: "Yes, you can reschedule classes with at least 4 hours advance notice. Our flexible scheduling system allows you to find alternative slots that work with your calendar.",
        },
        {
          q: "What is your makeup class policy?",
          a: "We offer makeup classes for cancelled sessions (with advance notice) and technical issues. Makeup classes are scheduled within the same month when possible.",
        },
        {
          q: "How long are the classes?",
          a: "Standard classes are 60 minutes long. Some specialized courses may have different durations, which will be clearly mentioned in the course description.",
        },
      ],
    },
  ];

  return (
    <section className="py-20">
      <div className="max-w-5xl mx-auto px-6">
        <motion.h4
          className="text-[#FF6B35] font-medium mb-2 flex items-center justify-center"
          
        >
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

        {faqData.map((section, secIndex) => (
          <div key={secIndex} className="mb-12">
            <h3 className="text-2xl font-semibold mb-6 text-gray-800 border-l-4 border-[#47c9c4] pl-3">
              {section.category}
            </h3>
            <div className="space-y-4">
              {section.items.map((faq, index) => {
                const isOpen = openIndex === `${secIndex}-${index}`;
                return (
                  <motion.div
                    key={index}
                    className="bg-white/70 backdrop-blur-md shadow-md rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:scale-[1.01] transition-all"
                    whileHover={{ y: -2 }}
                  >
                    <button
                      onClick={() => toggleFAQ(`${secIndex}-${index}`)}
                      className="w-full flex justify-between items-center p-5 text-left font-medium text-gray-800"
                    >
                      <span>{faq.q}</span>
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
                          {faq.a}
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
