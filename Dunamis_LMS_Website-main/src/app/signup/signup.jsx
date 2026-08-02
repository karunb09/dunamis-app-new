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
    <div className="min-h-screen bg-[#fffaf4] px-4 py-10 md:px-10 md:py-16">
      <div className="mx-auto flex w-full max-w-5xl overflow-hidden rounded-[32px] border border-orange-100/80 bg-white shadow-[0_48px_140px_-70px_rgba(249,115,22,0.5)]">
        {/* Left Section - Form */}
        <SignUpForm />

        {/* Right Section - Carousel */}
        <div className="relative hidden flex-1 items-center justify-center overflow-hidden bg-gradient-to-br from-[#fff1e8] via-[#fffaf4] to-[#e9fbfa] px-10 md:flex">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-orange-200/50 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-12 h-72 w-72 rounded-full bg-[#237673]/20 blur-3xl" />

          <div className="relative h-80 w-full max-w-xs">
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
                className="absolute inset-0 h-full w-full object-contain drop-shadow-xl"
              />
            </AnimatePresence>
          </div>

          {/* Dots */}
          <div className="absolute bottom-8 flex gap-2">
            {images.map((_, i) => (
              <span
                key={i}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  currentIndex === i ? "w-7 bg-orange-500" : "w-2.5 bg-orange-200"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
