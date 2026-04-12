"use client";

import MultiStepForm from "@/compoents/BecomeTeacherForm/BecomeTeacherForm";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Heart, Clock, Users, Award } from "lucide-react";
import { useEffect, useState } from "react";

export default function BecomeTeacher() {
  const images = [
    "/Music-rafiki.svg",
    "/Playing Music-bro.svg",
    "/Compose music-amico.svg",
    "/Compose music-bro.svg",
  ];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [images.length]);

  // Animation variants
  const variants = {
    enter: (direction) => ({
      x: direction > 0 ? 80 : -80,
      opacity: 0,
      scale: 0.95,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
      transition: { duration: 0.6, ease: "easeOut" },
    },
    exit: (direction) => ({
      zIndex: 0,
      x: direction > 0 ? -80 : 80,
      opacity: 0,
      scale: 0.95,
      transition: { duration: 0.6, ease: "easeIn" },
    }),
  };

  const sectionVariant = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    },
  };

  return (
    <main>
      {/* Hero Section */}
      <motion.section
        className="max-w-4xl mx-auto text-center px-6 py-12"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={sectionVariant}
      >
        <motion.h4
          className="text-[#FF6B35] font-medium mb-2"
          variants={sectionVariant}
        >
          Join our team
        </motion.h4>
        <motion.h1
          className="text-2xl sm:text-3xl md:text-3xl font-bold text-[#2D2D2D] mb-4"
          variants={sectionVariant}
        >
          Become an Instrctor
        </motion.h1>
        <motion.p className="text-xl text-gray-500" variants={sectionVariant}>
          Share your expertise and passion with aspiring learners. Join{" "}
          <span className="font-semibold">DUNAMIS</span> as an instructor and be
          part of a community that believes in transformative education.
        </motion.p>
      </motion.section>

      {/* Why Teach Section */}
      <motion.section
        className="bg-gray-50 py-16 px-6"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={sectionVariant}
      >
        <motion.h2
          className="text-2xl font-bold text-center mb-10"
          variants={sectionVariant}
        >
          Why Teach with DUNAMIS?
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-10">
          {/* Box 1 */}
          <div className="bg-white shadow-md rounded-2xl p-6 text-center hover:shadow-lg transition">
            <Heart className="text-orange-500 w-8 h-8 mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-2">Make a Difference</h3>
            <p className="text-gray-600 text-sm">
              Impact lives by sharing your passion and helping students discover
              their creative potential.
            </p>
          </div>

          {/* Box 2 */}
          <div className="bg-white shadow-md rounded-2xl p-6 text-center hover:shadow-lg transition">
            <Clock className="text-teal-500 w-8 h-8 mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-2">Flexible Schedule</h3>
            <p className="text-gray-600 text-sm">
              Choose your own hours and teach according to your availability
              with both online and offline options.
            </p>
          </div>

          {/* Box 3 */}
          <div className="bg-white shadow-md rounded-2xl p-6 text-center hover:shadow-lg transition">
            <Users className="text-pink-500 w-8 h-8 mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-2">Supportive Community</h3>
            <p className="text-gray-600 text-sm">
              Join a network of passionate educators and be part of a
              collaborative teaching environment.
            </p>
          </div>

          {/* Box 4 */}
          <div className="bg-white shadow-md rounded-2xl p-6 text-center hover:shadow-lg transition">
            <Award className="text-green-500 w-8 h-8 mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-2">Professional Growth</h3>
            <p className="text-gray-600 text-sm">
              Access to continuous training, workshops, and opportunities for
              career advancement.
            </p>
          </div>
        </div>
      </motion.section>

      {/* Requirements Section */}
      <motion.section
        className="max-w-6xl mx-auto px-6 py-16"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={sectionVariant}
      >
        <h2 className="text-2xl font-bold text-center mb-10">
          What We're Looking For
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-orange-50 p-8 rounded-xl shadow-sm">
          {[
            "Proven expertise in your subject area (minimum 3 years experience)",
            "Relevant qualifications or certifications in your field",
            "Excellent communication and interpersonal skills",
            "Passion for teaching and mentoring students",
            "Availability for regular teaching schedule",
            "Basic computer skills for online teaching",
          ].map((req, i) => (
            <motion.div
              key={i}
              className="flex items-start space-x-3"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <CheckCircle className="text-green-600 w-5 h-5 mt-1" />
              <p className="text-gray-700">{req}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Apply Form Section */}
      <motion.div
        className="flex flex-col md:flex-row"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={sectionVariant}
      >
        {/* Left Section */}
        <motion.div
          className="flex-1 flex flex-col justify-center px-6 md:px-20 py-10"
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <MultiStepForm />
        </motion.div>

        {/* Right Section - Framer Motion Carousel */}
        <div className="hidden md:flex flex-1 items-center justify-center relative overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.img
              key={currentIndex}
              src={images[currentIndex]}
              alt="Signup illustration"
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              custom={direction}
              className="max-w-md"
            />
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Contact Section */}
      <motion.section
        className="max-w-4xl mx-auto px-6 py-16 text-center"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-xl font-bold mb-4">Have Questions?</h2>
        <p className="text-gray-600 mb-6">
          Get in touch with our team to learn more about opportunities at{" "}
          <span className="font-semibold">DUNAMIS</span>.
        </p>
        <a
          href="/contact-us"
          className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
        >
          Contact Us
        </a>
        <p className="mt-4 text-gray-600">
          or email us at{" "}
          <a href="mailto:careers@dunamis.in" className="text-[#47c9c4]">
            careers@dunamis.in
          </a>
        </p>
      </motion.section>
    </main>
  );
}
