"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SignUpForm from "@/components/SignUpForm";

export default function PersonalInfoPage() {
  const images = [
    "/Playing Music-bro.svg",
    "/Music-rafiki.svg",
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

  return (
    <div className="flex flex-col md:flex-row bg-white p-20">
      {/* Left Section - Form */}
      <SignUpForm />

      {/* Right Section - Carousel */}
      <div className="hidden md:flex flex-1 bg-gray-50 items-center justify-center px-10 relative overflow-hidden">
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
            className="max-w-xs"
          />
        </AnimatePresence>

        {/* Dots */}
        <div className="absolute bottom-6 flex gap-2">
          {images.map((_, i) => (
            <span
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition ${
                currentIndex === i ? "bg-orange-500 scale-110" : "bg-gray-300"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
