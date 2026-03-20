"use client";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import FilterQuestionsModal from "@/compoents/PopupModals/FilterQuestionsModal";

export default function Testimonials() {
    const router = useRouter();
    const [isInterestModalOpen, setInterestModalOpen] = useState(false);
    const testimonials = [
        {
            name: "Rahul Sharma",
            course: "Guitar Fundamentals",
            feedback:
                "Alex makes learning guitar so easy and enjoyable. I went from zero to playing my favorite songs in just 3 months! The structured approach and personal attention made all the difference.",
            avatar: "https://i.pravatar.cc/100?img=12",
        },
        {
            name: "Priya Patel",
            course: "Piano Mastery",
            feedback:
                "Sarah's teaching method is exceptional. The combination of classical and modern pieces kept me motivated throughout. I never thought I could play piano at this level.",
            avatar: "https://i.pravatar.cc/100?img=48",
        },
        {
            name: "Kavya Dubey",
            course: "Contemporary Dance",
            feedback:
                "Maya helped me discover my artistic voice through movement. The classes are challenging but incredibly rewarding. I feel more confident and expressive.",
            avatar: "https://i.pravatar.cc/100?img=47",
        },
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.3 },
        },
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 40 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
    };

    return (
        <div>
            {/* Testimonials Section */}
            <motion.section
                className="py-20 bg-white px-6 text-center"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: false, amount: 0.2 }}
                variants={containerVariants}
            >
                <motion.p
                    className="text-[#FF6B35] font-medium mb-2"
                    initial={{ opacity: 0, y: -20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    Student Success Stories
                </motion.p>
                <motion.h2
                    className="text-3xl font-bold mb-4"
                    initial={{ opacity: 0, y: -20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    What Our Students Say
                </motion.h2>
                <motion.p
                    className="text-gray-600 mb-10 max-w-3xl mx-auto"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ duration: 1 }}
                >
                    Join thousands of students who have discovered their creative potential
                    and achieved their learning goals with Dunamis.
                </motion.p>

                {/* Testimonial Cards */}
                <motion.div
                    className=" grid md:grid-cols-3 gap-6 max-w-7xl mx-auto"
                    variants={containerVariants}
                >
                    {testimonials.map((item, index) => (
                        <motion.div
                            key={index}
                            className="bg-[#ff6b3514] rounded-xl border border-[#FF6B35] shadow p-6 text-left flex flex-col justify-between hover:shadow-lg hover:-translate-y-2 transition-transform duration-300"
                            variants={cardVariants}
                        >
                            <div className="flex text-[#FF6B35] mb-3">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="h-4 w-4 fill-[#FF6B35] text-[#FF6B35]" />
                                ))}
                            </div>
                            <p className="text-gray-700 mb-6 text-sm">"{item.feedback}"</p>

                            <div className="flex items-center gap-3 mt-auto">
                                <img
                                    src={item.avatar}
                                    alt={item.name}
                                    className="h-10 w-10 rounded-full object-cover"
                                />
                                <div>
                                    <p className="font-semibold text-sm">{item.name}</p>
                                    <p className="text-gray-500 text-sm">{item.course}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                <motion.button
                    className="cursor-pointer mt-10 px-6 py-3 border border-[#FF6B35] text-[#FF6B35] rounded-full hover:bg-[#FF6B35] hover:text-white transition text-sm font-medium"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Read More Testimonials
                </motion.button>
            </motion.section>

            {/* Call-to-Action Section */}
            <motion.section
                className="py-24 px-6 text-center text-gray-800 bg-teal-100"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, ease: "easeOut" }}
                viewport={{ once: false }}
            >
                <h2 className="text-2xl md:text-3xl font-bold mb-6">
                    Ready to Begin Your Creative Journey?
                </h2>
                <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10">
                    Join our vibrant community of learners and discover your potential.
                    Whether online or at our centres, your creative adventure starts here.
                </p>
               <div className="mt-6 flex flex-wrap gap-4 justify-center">
                           <motion.button
                             whileHover={{ scale: 1.08 }}
                             whileTap={{ scale: 0.96 }}
                             onClick={() => router.push("/courses")}
                             className="cursor-pointer border border-orange-500 bg-orange-500 text-white transition-all duration-300 ease-in-out px-6 py-2 rounded-full"
                           >
                        Explore All Courses
                    </motion.button>
                   <motion.button
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setInterestModalOpen(true)}
                        className="text-[#47c9c4] cursor-pointer border border-[#47c9c4] hover:text-white hover:bg-[#47c9c4] transition-all duration-300 ease-in-out px-6 py-2 rounded-full"
                        >
                        Book a Demo
                    </motion.button>
                </div>
            </motion.section>
            <FilterQuestionsModal
                isOpen={isInterestModalOpen}
                onClose={() => setInterestModalOpen(false)}
            />
        </div>
    );
}
