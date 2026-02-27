"use client";
import { motion } from "framer-motion";
import {
  FiUsers,
  FiStar,
  FiTrendingUp,
  FiTarget,
  FiEye,
  FiArrowRight,
  FiPhone,
  FiBook,
} from "react-icons/fi";
import { FaHandsHelping } from "react-icons/fa";
import { GoBook } from "react-icons/go";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const About = () => {
  return (
    <div className="bg-white text-gray-800 mt-20">
      {/* Hero Section */}
      <section className="text-center py-12 px-4">
        <motion.h1
          className="text-2xl sm:text-3xl md:text-3xl font-bold mt-2 text-[#2D2D2D]"
          initial="hidden"
          whileInView="visible"
          variants={fadeUp}
        >
          About DUNAMIS
        </motion.h1>
      </section>

      {/* Mission and Vision Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 px-6 md:px-20 pb-16">
        <motion.div
          className="bg-red-50 p-6 rounded-lg shadow-sm"
          initial="hidden"
          whileInView="visible"
          variants={fadeUp}
        >
          <h3 className="flex items-center text-xl font-semibold text-red-600 mb-2">
            <FiBook className="mr-2" />
            Our Story
          </h3>
          <p>
            More than just a institute, Dunamis is a vibrant learning community
            where creativity is nurtured, confidence is built, and every
            individual is encouraged to express, explore, and grow.
          </p>
        </motion.div>
        <motion.div
          className="bg-green-50 p-6 rounded-lg shadow-sm"
          initial="hidden"
          whileInView="visible"
          variants={fadeUp}
        >
          <h3 className="flex items-center text-xl font-semibold text-green-600 mb-2">
            <FiTarget className="mr-2" />
            Our Mission
          </h3>
          <p>
            To provide exceptional creative education that nurtures talent,
            builds confidence, and creates a supportive community where every
            individual can discover and develop their artistic potential.
          </p>
        </motion.div>
        <motion.div
          className="bg-purple-50 p-6 rounded-lg shadow-sm"
          initial="hidden"
          whileInView="visible"
          variants={fadeUp}
        >
          <h3 className="flex items-center text-xl font-semibold text-purple-600 mb-2">
            <FiEye className="mr-2" />
            Our Vision
          </h3>
          <p>
            To be the leading platform for creative education, making
            high-quality artistic training accessible to everyone, everywhere,
            while fostering a global community of passionate learners and
            creators.
          </p>
        </motion.div>
      </section>

      {/* Journey Section */}
      <section className="px-6 md:px-20 pb-16">
        <motion.h2
          className="text-2xl sm:text-3xl md:text-3xl font-bold text-center mb-12"
          initial="hidden"
          whileInView="visible"
          variants={fadeUp}
        >
          Our Journey
        </motion.h2>

        <div className="space-y-10">
          {/* Step 1 */}
          <motion.div
            className="border-l-4 border-blue-500 pl-6"
            initial="hidden"
            whileInView="visible"
            variants={fadeUp}
          >
            <h4 className="text-xl font-semibold">The Beginning (2020)</h4>
            <p className="text-gray-600 mt-2">
              Dunamis School of Music began during the 2020 pandemic lockdown.
              It started as a small online initiative designed to provide
              affordable, high-quality creative education at a time when
              connection and creativity were more important than ever. Our
              founders believed that everyone should have access to meaningful
              artistic learning.
            </p>
          </motion.div>

          {/* Step 2 */}
          <motion.div
            className="border-l-4 border-green-500 pl-6"
            initial="hidden"
            whileInView="visible"
            variants={fadeUp}
          >
            <h4 className="text-xl font-semibold">
              Expansion and Establishment (2024)
            </h4>
            <p className="text-gray-600 mt-2">
              In 2024, Dunamis officially became a private limited company and
              expanded to new cities across India. With physical centers and a
              growing presence in various communities, we began offering more
              diverse programs in music, dance, and games.
            </p>
          </motion.div>

          {/* Step 3 */}
          <motion.div
            className="border-l-4 border-purple-500 pl-6"
            initial="hidden"
            whileInView="visible"
            variants={fadeUp}
          >
            <h4 className="text-xl font-semibold">
              Digital Transformation (2025)
            </h4>
            <p className="text-gray-600 mt-2">
              In 2025, we launched our dedicated digital learning platform to
              make creative education even more accessible. By reaching learners
              through the internet, Dunamis continues to grow its impact and
              bring quality instruction to homes across the country and beyond.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-gray-50 py-16 px-6 md:px-20">
        <motion.h2
          className="text-2xl sm:text-3xl md:text-3xl font-bold text-center mb-12"
          initial="hidden"
          whileInView="visible"
          variants={fadeUp}
        >
          Our Values
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {/* Community */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            variants={fadeUp}
            className="flex flex-col items-center"
          >
            <FiUsers className="text-3xl text-blue-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Community</h3>
            <p>
              Building connections and fostering a supportive environment where
              everyone belongs.
            </p>
          </motion.div>

          {/* Excellence */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            variants={fadeUp}
            className="flex flex-col items-center"
          >
            <FiStar className="text-3xl text-yellow-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Excellence</h3>
            <p>
              Maintaining the highest standards in education while making
              learning enjoyable and accessible.
            </p>
          </motion.div>

          {/* Growth */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            variants={fadeUp}
            className="flex flex-col items-center"
          >
            <FiTrendingUp className="text-3xl text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Growth</h3>
            <p>
              Encouraging personal development and artistic expression at every
              level of learning.
            </p>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-10/12 mx-auto bg-gradient-to-br from-[#47c9c4] via-[#c3b091] to-[#fc6d3f] py-8 px-6 md:px-20 text-center rounded-2xl shadow-lg mb-6 mt-6">
        <motion.h3
          className="text-2xl font-bold mb-4 text-white"
          initial="hidden"
          whileInView="visible"
          variants={fadeUp}
        >
          Join Our Community
        </motion.h3>
        <motion.p
          className="mb-6 max-w-xl mx-auto text-white"
          initial="hidden"
          whileInView="visible"
          variants={fadeUp}
        >
          Be part of a community that believes in the transformative power of
          creative education.
        </motion.p>

        <div className="flex flex-col md:flex-row items-center justify-center gap-4">
          <motion.a
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            href="/courses"
            className="inline-flex items-center gap-2 border border-white bg-white text-black px-6 py-3 rounded-full font-medium shadow-md"
          >
            <GoBook />

            Explore Courses
          </motion.a>
          <motion.a
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            href="/contact"
            className="inline-flex items-center gap-2 border border-white text-white hover:text-black hover:bg-white px-6 py-3 rounded-full font-medium shadow-md"
          >
            <FiPhone />
            Get In Touch
          </motion.a>
        </div>
      </section>
    </div>
  );
};

export default About;
