"use client";
import { motion } from "framer-motion";

export default function About() {
    return (
        <motion.section
            className="bg-[#F5F5F5] mt-4 py-10 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto rounded-lg mb-4"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            viewport={{ once: false, amount: 0.2 }}
        >
            {/* Tagline */}
            <motion.p
                className="text-[10px] sm:text-xs text-[#FF6B35] mb-2 uppercase tracking-wide text-center sm:text-left"
                initial={{ opacity: 0, y: -30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: false }}
            >
                Listed As The Best Learning Platform 2025
            </motion.p>

            {/* Heading */}
            <motion.h2
                className="text-xl sm:text-2xl md:text-3xl font-bold text-[#2D2D2D] mb-4 text-center sm:text-left"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                viewport={{ once: false }}
            >
                What is Dunamis?
            </motion.h2>

            {/* Paragraph */}
            <motion.p
                className="text-sm sm:text-base text-[#2D2D2D] leading-relaxed text-justify sm:text-left"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                viewport={{ once: false }}
            >
                Dunamis is more than just an institute. It's a vibrant community built
                on the belief that everyone deserves a space to express, explore, and
                evolve. What began as the Dunamis School of Music, a one-stop
                destination for music education, concerts, evening programs, and
                workshops has now grown into a multidisciplinary platform for music,
                movement, and the fine arts.
                <br />
                <br />
                Here, learning goes beyond technique. It's about building confidence,
                community, and creativity with guidance from accomplished mentors who
                are passionate about sharing their craft.
            </motion.p>
        </motion.section>
    );
}
