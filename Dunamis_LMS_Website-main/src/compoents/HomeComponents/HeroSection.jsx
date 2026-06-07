"use client";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import FilterQuestionsModal from "@/compoents/PopupModals/FilterQuestionsModal";

const heroImages = [
  { src: "/BG-1-hero.jpg", alt: "Students learning music together" },
  { src: "/BG-2-hero.jpg", alt: "Creative music learning illustration" },
  { src: "/BG-3-hero.jpg", alt: "Performers in a creative learning space" },
];

const marqueeItems = [
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
];

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
  const [currentImage, setCurrentImage] = useState(0);
  const [isInterestModalOpen, setInterestModalOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % heroImages.length);
    }, 6200);

    return () => clearInterval(interval);
  }, []);

  const activeImage = heroImages[currentImage];

  return (
    <>
      <section className="relative min-h-screen overflow-hidden px-6 py-2 text-left text-white">
        <div className="absolute inset-0">
          <AnimatePresence initial={false}>
            <motion.div
              key={activeImage.src}
              variants={heroImageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="absolute inset-0"
            >
              <Image
                src={activeImage.src}
                alt={activeImage.alt}
                fill
                priority={currentImage === 0}
                loading={currentImage === 0 ? undefined : "lazy"}
                sizes="100vw"
                quality={75}
                className="object-cover object-center"
              />
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(9,16,32,0.78)_0%,rgba(12,20,33,0.58)_38%,rgba(14,22,34,0.3)_62%,rgba(10,14,24,0.58)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(71,201,196,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(239,106,50,0.22),transparent_38%)]" />

        {/* Floating music note particles — xs/sm only; md+ gets MusicNoteShower */}
        <div className="md:hidden">
          <span className="float-note text-white/30 text-3xl left-[8%] top-[22%]" style={{ "--dur": "7s", "--delay": "0s" }} aria-hidden>♩</span>
          <span className="float-note text-white/25 text-5xl right-[12%] top-[18%]" style={{ "--dur": "9s", "--delay": "1.2s" }} aria-hidden>♪</span>
          <span className="float-note text-white/20 text-2xl left-[18%] bottom-[28%]" style={{ "--dur": "8s", "--delay": "2.4s" }} aria-hidden>♫</span>
          <span className="float-note text-white/30 text-4xl right-[22%] bottom-[32%]" style={{ "--dur": "6.5s", "--delay": "0.8s" }} aria-hidden>♬</span>
          <span className="float-note text-white/20 text-xl left-[62%] top-[38%]" style={{ "--dur": "10s", "--delay": "3s" }} aria-hidden>♩</span>
          <span className="float-note text-white/25 text-3xl right-[38%] top-[72%]" style={{ "--dur": "7.5s", "--delay": "1.8s" }} aria-hidden>♪</span>
        </div>

        <div className="relative z-10 flex min-h-screen max-w-5xl flex-col items-start justify-center px-6">
          <motion.h1
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mt-8 text-4xl font-bold leading-tight md:mt-10 md:text-6xl"
          >
            <span className="gradient-text-animate">Discover Your</span>
            <br />
            <span className="text-white">Creative Potential</span>
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
              whileHover={{ scale: 1.06, boxShadow: "0 20px 40px -14px rgba(239,106,50,0.7)" }}
              whileTap={{ scale: 0.96 }}
              onClick={() => router.push("/courses")}
              className="btn-glow cursor-pointer rounded-full border border-orange-500 bg-orange-500 px-6 py-2 text-white transition-all duration-300 ease-in-out hover:bg-orange-400"
            >
              Explore Courses
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setInterestModalOpen(true)}
              className="cursor-pointer rounded-full border border-white/70 bg-white/14 px-6 py-2 text-white backdrop-blur-md transition-all duration-300 ease-in-out hover:border-[#47c9c4] hover:bg-[#47c9c4] hover:text-white"
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
            {[...marqueeItems, ...marqueeItems].map((item, index) => (
              <span
                key={`${item.text}-${index}`}
                className={`inline-block mx-4 ${item.color}`}
              >
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
