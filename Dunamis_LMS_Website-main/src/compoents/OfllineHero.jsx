"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";

const stats = [
    { value: 4, label: "Cities" },
    { value: 170, label: "Students" },
    { value: 20, label: "Instructors", suffix: "+" },
];

// Animation Variants
const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    visible: (i) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, delay: i * 0.2 },
    }),
};

// Counter Component
const Counter = ({ value, duration = 2000, suffix = "" }) => {
    const [count, setCount] = useState(0);
    const countRef = useRef(0);
    const rafRef = useRef(null);

    useEffect(() => {
        const startTime = Date.now();
        const startValue = 0;
        const endValue = value;

        const animate = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const currentCount = Math.floor(startValue + (endValue - startValue) * progress);
            
            if (countRef.current !== currentCount) {
                countRef.current = currentCount;
                setCount(currentCount);
            }

            if (progress < 1) {
                rafRef.current = requestAnimationFrame(animate);
            }
        };

        rafRef.current = requestAnimationFrame(animate);

        return () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, [value, duration]);

    return (
        <span>
            {count}
            {suffix}
        </span>
    );
};

const OfflineHero = () => {
    return (
        <section className="py-16 text-center overflow-hidden">
            {/* Subheading */}
            <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="text-[#FF6B35] font-medium mb-2"
            >
                Experience Learning in Person
            </motion.p>

            {/* Heading */}
            <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                viewport={{ once: true }}
                className="text-3xl font-bold mt-2 text-[#2D2D2D]"
            >
                Our Offline Centres
            </motion.h2>

            {/* Description */}
            <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                viewport={{ once: true }}
                className="mt-4 text-gray-500 max-w-2xl mx-auto"
            >
                Visit our physical locations for hands-on learning, personalized
                instruction, and community engagement. Each centre is equipped with
                professional-grade instruments and facilities.
            </motion.p>

            {/* Stats */}
            <div className="mt-10 flex flex-wrap justify-center gap-12">
                {stats.map((item, idx) => (
                    <motion.div
                        key={idx}
                        custom={idx}
                        variants={fadeUp}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        className="text-center"
                    >
                        <h3 className="text-3xl font-bold text-[#FF6B35]">
                            <Counter value={item.value} suffix={item.suffix || ""} />
                        </h3>
                        <p className="text-gray-600">{item.label}</p>
                    </motion.div>
                ))}
            </div>
        </section>
    );
};

export default OfflineHero;