"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import FilterQuestionsModal from "@/compoents/PopupModals/FilterQuestionsModal";

const heroImageVariants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      duration: 1.4,
      ease: "easeInOut",
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 1.4,
      ease: "easeInOut",
    },
  },
};

export default function HeroSection() {
  const router = useRouter();
  const bgImages = ["/BG-1.jpg", "/BG-2.png", "/BG-3.png"];
  const [currentImage, setCurrentImage] = useState(0);
  const [isInterestModalOpen, setInterestModalOpen] = useState(false);

  useEffect(() => {
    const preloadImages = bgImages.map((src) => {
      const image = new window.Image();
      image.src = src;
      return image;
    });

    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % bgImages.length);
    }, 6200);

    return () => {
      clearInterval(interval);
      preloadImages.length = 0;
    };
  }, []);

  return (
    <>
      <section className="relative min-h-screen overflow-hidden px-6 py-2 text-left text-white">
        <div className="absolute inset-0">
          <AnimatePresence initial={false}>
            <motion.div
              key={bgImages[currentImage]}
              variants={heroImageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${bgImages[currentImage]})` }}
            />
          </AnimatePresence>
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(9,16,32,0.78)_0%,rgba(12,20,33,0.58)_38%,rgba(14,22,34,0.3)_62%,rgba(10,14,24,0.58)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(71,201,196,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(239,106,50,0.22),transparent_38%)]" />

        <div className="relative z-10 flex min-h-screen max-w-5xl flex-col items-start justify-center px-6">
          <motion.h1
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mt-8 text-4xl font-bold leading-tight text-white md:mt-10 md:text-6xl"
          >
            Discover Your Creative Potential
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="mb-6 max-w-2xl text-left text-lg text-white/80 md:text-2xl"
          >
            From vocals and instruments to dance and strategy games. <br />
            Dunamis is your space to learn, grow, and express.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.6 }}
            className="mt-6 flex flex-wrap items-center justify-start gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => router.push("/courses")}
              className="cursor-pointer rounded-full border border-orange-500 bg-orange-500 px-6 py-2 text-white shadow-[0_18px_40px_-20px_rgba(239,106,50,0.9)] transition-all duration-300 ease-in-out hover:bg-orange-400"
            >
              Explore Courses
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setInterestModalOpen(true)}
              className="cursor-pointer rounded-full border border-white/70 bg-white/14 px-6 py-2 text-white shadow-[0_18px_40px_-22px_rgba(15,23,42,0.85)] backdrop-blur-md transition-all duration-300 ease-in-out hover:border-[#47c9c4] hover:bg-[#47c9c4] hover:text-white"
            >
              Book a Demo
            </motion.button>
          </motion.div>
        </div>
      </section>
            {/* Scrolling word loop with unique colors (seamless) */}
      <div className="relative overflow-hidden bg-black py-6">
          <div className="marquee">
            <div className="flex">
              {[
                { text: "Creativity", color: "text-red-400" },
                { text: "✦", color: "text-white" },
                { text: "Growth", color: "text-orange-400" },
                { text: "✦", color: "text-white" },
                { text: "Play", color: "text-yellow-300" },
                { text: "✦", color: "text-white" },
                { text: "Performance", color: "text-green-400" },
                { text: "✦", color: "text-white" },
                { text: "Collaboration", color: "text-teal-400" },
                { text: "✦", color: "text-white" },
                { text: "Inspiration", color: "text-cyan-400" },
                { text: "✦", color: "text-white" },
                { text: "Expression", color: "text-blue-400" },
                { text: "✦", color: "text-white" },
                { text: "Rhythm", color: "text-indigo-400" },
                { text: "✦", color: "text-white" },
                { text: "Storytelling", color: "text-purple-400" },
                { text: "✦", color: "text-white" },
                { text: "Mastery", color: "text-pink-400" },
                { text: "✦", color: "text-white" },
                { text: "Discovery", color: "text-rose-400" },
                { text: "✦", color: "text-white" },
                { text: "Movement", color: "text-lime-400" },
                { text: "✦", color: "text-white" },
                { text: "Fun", color: "text-amber-300" },
                { text: "✦", color: "text-white" },
                { text: "Flow", color: "text-emerald-400" },
                { text: "✦", color: "text-white" },
                { text: "Freedom", color: "text-sky-400" },
                { text: "✦", color: "text-white" },
                { text: "Expression", color: "text-fuchsia-400" },
                { text: "✦", color: "text-white" },
              ].map((item, index) => (
                <span key={`a-${index}`} className={`inline-block mx-4 ${item.color}`}>
                  {item.text}
                </span>
              ))}
              {[
                { text: "Creativity", color: "text-red-400" },
                { text: "✦", color: "text-white" },
                { text: "Growth", color: "text-orange-400" },
                { text: "✦", color: "text-white" },
                { text: "Play", color: "text-yellow-300" },
                { text: "✦", color: "text-white" },
                { text: "Performance", color: "text-green-400" },
                { text: "✦", color: "text-white" },
                { text: "Collaboration", color: "text-teal-400" },
                { text: "✦", color: "text-white" },
                { text: "Inspiration", color: "text-cyan-400" },
                { text: "✦", color: "text-white" },
                { text: "Expression", color: "text-blue-400" },
                { text: "✦", color: "text-white" },
                { text: "Rhythm", color: "text-indigo-400" },
                { text: "✦", color: "text-white" },
                { text: "Storytelling", color: "text-purple-400" },
                { text: "✦", color: "text-white" },
                { text: "Mastery", color: "text-pink-400" },
                { text: "✦", color: "text-white" },
                { text: "Discovery", color: "text-rose-400" },
                { text: "✦", color: "text-white" },
                { text: "Movement", color: "text-lime-400" },
                { text: "✦", color: "text-white" },
                { text: "Fun", color: "text-amber-300" },
                { text: "✦", color: "text-white" },
                { text: "Flow", color: "text-emerald-400" },
                { text: "✦", color: "text-white" },
                { text: "Freedom", color: "text-sky-400" },
                { text: "✦", color: "text-white" },
                { text: "Expression", color: "text-fuchsia-400" },
                { text: "✦", color: "text-white" },
              ].map((item, index) => (
                <span key={`b-${index}`} className={`inline-block mx-4 ${item.color}`}>
                  {item.text}
                </span>
              ))}
            </div>
          </div>
        </div>
      <FilterQuestionsModal
        isOpen={isInterestModalOpen}
        onClose={() => setInterestModalOpen(false)}
      />
    </>
  );
}
