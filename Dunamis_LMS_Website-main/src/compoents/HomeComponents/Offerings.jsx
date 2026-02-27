"use client";
import { motion } from "framer-motion";
import { FaMusic, FaLanguage } from "react-icons/fa"; 
import { GiMusicalNotes } from "react-icons/gi";

export default function Offerings() {
    // Parent variant for stagger
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.3 } 
        }
    };
    const cardVariants = {
        hidden: { opacity: 0, y: 50 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
    };

    return (
        <motion.section
            className="bg-[#F5F5F5] py-12 px-6 mt-12 max-w-7xl mx-auto rounded-lg mb-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.2 }}
            variants={containerVariants}
        >
            <motion.h2
                className="text-2xl font-bold text-[#2D2D2D] mb-6 text-center"
                initial={{ opacity: 0, y: -30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: false }}
            >
                Here's what we offer at Dunamis
            </motion.h2>

            <motion.div
                className="grid md:grid-cols-3 gap-4"
                variants={containerVariants}
            >
                {/* Music */}
                <motion.div
                    className="bg-white p-5 rounded-xl shadow hover:shadow-md transition"
                    variants={cardVariants}
                >
                    <h3 className="flex items-center gap-2 font-semibold text-[#A259FF] mb-2 text-lg">
                        <FaMusic className="text-[#A259FF]" /> Music
                    </h3>
                    <p className="text-[#2D2D2D] opacity-80 text-sm">
                        Find your voice and master instruments, from Carnatic vocals to contemporary guitar, with expert guidance.
                    </p>
                </motion.div>

                {/* Dance */}
                <motion.div
                    className="bg-white p-5 rounded-xl shadow hover:shadow-md transition"
                    variants={cardVariants}
                >
                    <h3 className="flex items-center gap-2 font-semibold text-[#FF6F61] mb-2 text-lg">
                        <GiMusicalNotes className="text-[#FF6F61]" /> Dance
                    </h3>
                    <p className="text-[#2D2D2D] opacity-80 text-sm">
                        Explore a diverse range of dance styles from Zumba to Bharatanatyam that move your body and spirit.
                    </p>
                </motion.div>

                {/* Languages */}
                <motion.div
                    className="bg-white p-5 rounded-xl shadow hover:shadow-md transition"
                    variants={cardVariants}
                >
                    <h3 className="flex items-center gap-2 font-semibold text-teal-500 mb-2 text-lg">
                        <FaLanguage className="text-teal-500" /> Languages
                    </h3>
                    <p className="text-[#2D2D2D] opacity-80 text-sm">
                        Learn new cultures and languages, classes that help you express yourself fluently and fearlessly.
                    </p>
                </motion.div>
            </motion.div>
        </motion.section>
    );
}
