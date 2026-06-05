"use client";
import { useScroll, motion } from "framer-motion";

export default function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-[100] h-[3px] bg-gradient-to-r from-[#ef6a32] via-[#ff9a5c] to-[#47c9c4] origin-left pointer-events-none"
      style={{ scaleX: scrollYProgress }}
    />
  );
}
