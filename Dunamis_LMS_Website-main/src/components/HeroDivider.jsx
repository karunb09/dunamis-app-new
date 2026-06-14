"use client";
import { motion } from "framer-motion";
import { LuMusic, LuMic, LuMusic2, LuPalette, LuActivity, LuHeart, LuDumbbell, LuSparkles, LuUsers } from "react-icons/lu";

const BUBBLES = [
  { Icon: LuMusic,     color: "#FF6B35", offsetY: 0,   delay: 0 },
  { Icon: LuActivity,  color: "#22c55e", offsetY: -10, delay: 0.4 },
  { Icon: LuMic,       color: "#47c9c4", offsetY: 6,   delay: 0.8 },
  { Icon: LuPalette,   color: "#ec4899", offsetY: -6,  delay: 0.2 },
  { Icon: LuHeart,     color: "#ef4444", offsetY: -14, delay: 1.0 },
  { Icon: LuMusic2,    color: "#a855f7", offsetY: 2,   delay: 0.6 },
  { Icon: LuDumbbell,  color: "#f59e0b", offsetY: -8,  delay: 1.2 },
  { Icon: LuSparkles,  color: "#3b82f6", offsetY: 4,   delay: 0.3 },
  { Icon: LuUsers,     color: "#8b5cf6", offsetY: -2,  delay: 0.9 },
];

export default function HeroDivider() {
  return (
    <div className="relative z-10 -mt-5 mb-2 flex justify-around items-center px-4 md:px-12 pointer-events-none overflow-visible">
      {BUBBLES.map(({ Icon, color, offsetY, delay }, i) => (
        <motion.div
          key={i}
          className="flex items-center justify-center rounded-full bg-[#fffaf4] border border-gray-200 shadow-md"
          style={{
            width: 36,
            height: 36,
            flexShrink: 0,
            translateY: offsetY,
          }}
          animate={{ y: [offsetY, offsetY - 4, offsetY] }}
          transition={{
            repeat: Infinity,
            duration: 3,
            delay,
            ease: "easeInOut",
          }}
        >
          <Icon style={{ width: 15, height: 15, color }} />
        </motion.div>
      ))}
    </div>
  );
}
