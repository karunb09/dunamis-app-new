"use client";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import FilterQuestionModal from "../PopupModals/FilterQuestionsModal";

export default function HeroSection() {
    const router = useRouter();
    const bgImages = [
        "/BG-1.jpg",
        "/BG-2.png",
        "/BG-3.png",
    ];
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [currentImage, setCurrentImage] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentImage((prev) => (prev + 1) % bgImages.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <>
            <section
                className="relative text-white py-2 px-6 overflow-hidden min-h-screen text-left"
                style={{
                    backgroundImage: `url(${bgImages[currentImage]})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    transition: "background-image 1s ease-in-out",
                }}
            >
                {/* Overlay for gradient effect */}
            <div className="relative max-w-5xl z-10 flex flex-col items-start justify-center min-h-screen px-6">
            <motion.h1
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-4xl md:text-6xl font-bold mb-4 leading-tight text-white text-left mt-24"
            >
              Discover Your Creative Potential
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="text-lg md:text-2xl mb-6 text-white/80 max-w-2xl text-left"
            >
              From vocals and instruments to dance and strategy games. <br />
              Dunamis is your space to learn, grow, and express.
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2, delay: 0.6 }}
              className="flex flex-wrap justify-start items-center gap-4 mt-6"
            >
              <motion.button
               whileHover={{ scale: 1.08 }}
               whileTap={{ scale: 0.96 }}
               onClick={() => router.push("/courses")}
               className="bg-orange-500 cursor-pointer border border-orange-600 hover:bg-orange-400 text-white transition-all duration-300 ease-in-out px-6 py-2 rounded-full"
               >
                Explore Courses
              </motion.button>

              <motion.button
               whileHover={{ scale: 1.08 }}
               whileTap={{ scale: 0.96 }}
               onClick={() => router.push("/contact")}
               className="text-[#47c9c4] cursor-pointer border border-[#47c9c4] hover:text-white hover:bg-[#47c9c4] transition-all duration-300 ease-in-out px-6 py-2 rounded-full"
               >
                Join a Free Demo
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


        </>
    );
}
