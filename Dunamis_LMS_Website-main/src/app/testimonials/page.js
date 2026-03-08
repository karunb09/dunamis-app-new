"use client";

import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.25 }
  }
};
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut", delay: i * 0.1 } })
};
const textVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, delay: 0.1 } }
};

const topTestimonials = [
  {
    rating: 5,
    text: "Dunamis transformed my confidence in music. The teachers are supportive and make learning fun!",
    name: "Riya Sharma",
  },
  {
    rating: 5,
    text: "I never thought online learning could feel this personal. The community is so encouraging.",
    name: "Arjun Patel",
  },
  {
    rating: 5,
    text: "From beginner to confident performer, Dunamis made my journey possible!",
    name: "Neha Verma",
  },
];

const detailedTestimonials = [
  {
    rating: 5,
    text: "DUNAMIS has been a game-changer for me. The instructors are knowledgeable and supportive, and the lessons are structured in a way that makes learning fun and engaging. I've seen significant improvement in my musical abilities!",
    name: "Sarah Johnson",
    course: "Western Guitar",
    image: "https://randomuser.me/api/portraits/women/44.jpg",
  },
  {
    rating: 5,
    text: "Learning at DUNAMIS has been an incredibly fulfilling journey. The personalized attention and flexible scheduling have allowed me to progress at my own pace while still being challenged to grow.",
    name: "Mike Chen",
    course: "Piano Mastery",
    image: "https://randomuser.me/api/portraits/men/32.jpg",
  },
  {
    rating: 5,
    text: "The Zumba classes at DUNAMIS are amazing! The energy is infectious, and I've not only improved my fitness but also gained confidence in dancing. The instructors make every session enjoyable and motivating.",
    name: "Emily Davis",
    course: "Zumba Fitness",
    image: "https://randomuser.me/api/portraits/women/65.jpg",
  },
  {
    rating: 5,
    text: "The Trinity College preparation at DUNAMIS was exceptional. My instructor helped me not just pass my exams but truly understand and appreciate classical music. The methodology is world-class.",
    name: "Rajesh Kumar",
    course: "Classical Violin",
    image: "https://randomuser.me/api/portraits/men/41.jpg",
  },
  {
    rating: 5,
    text: "Learning Carnatic vocals at DUNAMIS has been a transformative experience. The depth of knowledge and patience of my instructor has helped me connect with our cultural heritage in a meaningful way.",
    name: "Priya Sharma",
    course: "Carnatic Vocals",
    image: "https://randomuser.me/api/portraits/women/68.jpg",
  },
  {
    rating: 5,
    text: "The chess program at DUNAMIS has sharpened not just my game but my overall analytical thinking. The strategies I've learned here have helped me in academics and life decisions too.",
    name: "Alex Rodriguez",
    course: "Strategic Chess",
    image: "https://randomuser.me/api/portraits/men/50.jpg",
  },
];

export default function Testimonials() {
  return (
    <section className="bg-white px-6 py-20">
      {/* Heading */}
      <motion.div className="text-center mb-16" initial={{ opacity: 0, y: -10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false }} transition={{ duration: 0.5 }}>
        <p className="text-[#47c9c4] font-medium mb-2">Hear from our students</p>
        <h2 className="text-2xl sm:text-3xl md:text-3xl font-extrabold mb-2">Student Testimonials</h2>
        <p className="text-gray-600 mt-2 max-w-2xl mx-auto text-xl">
          Discover what our students have to say about their learning journey at DUNAMIS.
          Real experiences from real people.
        </p>
      </motion.div>

      {/* Stats */}
 <section className="md:grid-cols-3 gap-6 px-2 md:px-12 pb-16">
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center mb-12 max-w-3xl mx-auto">
    
    <div className="bg-cyan-50 rounded-xl shadow-md flex flex-col items-center justify-center px-6 py-4">
      <h3 className="text-3xl md:text-3xl font-bold text-orange-600">500+</h3>
      <p className="text-gray-600 text-sm md:text-base mt-1">Happy Students</p>
    </div>
    
    <div className="bg-orange-50 rounded-xl shadow-md flex flex-col items-center justify-center px-6 py-4">
      <h3 className="text-3xl md:text-3xl font-bold text-[#47c9c4]">4.9</h3>
      <p className="text-gray-600 text-sm md:text-base mt-1">Average Rating</p>
    </div>
    
    <div className="bg-green-50 rounded-xl shadow-md flex flex-col items-center justify-center px-6 py-4">
      <h3 className="text-3xl md:text-3xl font-bold text-green-500">95%</h3>
      <p className="text-gray-600 text-sm md:text-base mt-1">Satisfaction Rate</p>
    </div>

  </div>
</section>


      

      {/* Detailed Testimonials with Profile */}
      <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.2 }}
      >
        {detailedTestimonials.map((t, i) => (
          <motion.div
            key={i}
            whileHover={{ rotateY: 8, rotateX: -5, scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="p-6 rounded-2xl shadow-md border border-gray-200 bg-white"
            variants={cardVariants}
            custom={i}
          >
            <div className="flex text-pink-600 mb-3">
              {Array.from({ length: t.rating }).map((_, idx) => (
                <Star key={idx} className="w-5 h-5 fill-pink-600" />
              ))}
            </div>
            <motion.div variants={textVariants}>
              <Quote className="w-7 h-7 md:w-8 md:h-8 text-cyan-500 mb-3" />
            </motion.div>
            <motion.p className="text-gray-700 leading-relaxed mb-6 text-sm md:text-base" variants={textVariants}>“{t.text}”</motion.p>
            <div className="flex items-center space-x-3">
              <img
                src={t.image}
                alt={t.name}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <p className="font-semibold text-gray-900 text-sm md:text-base">{t.name}</p>
                <p className="text-gray-600 text-xs md:text-sm">{t.course}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Bottom Join Section */}
      <motion.div className="mt-16 w-11/12 mx-auto bg-gradient-to-br from-[#47c9c4] via-[#c3b091] to-[#fc6d3f] py-12 px-6 md:px-20 text-center rounded-2xl shadow-lg rounded-2xl flex flex-col items-center text-center"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.3 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <h2 className="text-xl sm:text-2xl md:text-2xl text-white font-bold mb-4">
          Join Our Community of Learners
        </h2>
        <p className="text-gray-600 mb-6 max-w-2xl text-sm md:text-base text-white">
          Start your own success story with <span className="font-semibold">DUNAMIS</span>. 
          Experience the difference quality education makes.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button className="px-6 py-3  border border-white  text-black bg-white rounded-full transition text-sm md:text-base">
            Start Learning Today
          </button>
          <button className="px-6 py-3  border border-white text-white hover:text-black hover:bg-white rounded-full transition text-sm md:text-base">
            Share Your Story
          </button>
        </div>
      </motion.div>
    </section>
  );
}
