"use client";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

const stories = [
  {
    title: "Ananya Gupta, 16",
    subtitle: "Trinity College Grade 8 Distinction",
    desc: "Started as a complete beginner, Ananya’s dedication and our structured curriculum helped her achieve Grade 8 with distinction in just 2 years.",
    tag: "Western Vocals",
    date: "December 2023",
    image:
      "https://",
  },
  {
    title: "Arjun Mehta, 22",
    subtitle: "Professional Guitarist",
    desc: "From learning basic chords to becoming a professional session musician, Arjun credits DUNAMIS for providing him with both technical skills and confidence.",
    tag: "Guitar",
    date: "March 2024",
    image:
      "https://",
  },
  {
    title: "Kavya Nair, 25",
    subtitle: "State Level Competition Winner",
    desc: "After 3 years of Carnatic music training, Kavya won the state-level classical music competition. Her journey from novice to competition winner is inspiring.",
    tag: "Carnatic Vocals",
    date: "August 2023",
    image:
      "https://",
  },
  {
    title: "Rohan Singh, 14",
    subtitle: "School District Champion",
    desc: "Rohan became the youngest district champion in his school’s history and now represents his state in national competitions.",
    tag: "Chess",
    date: "October 2023",
    image:
      "https://",
  },
  {
    title: "Priya Sharma, 28",
    subtitle: "Certified Zumba Instructor",
    desc: "Priya is now a certified instructor running her own Zumba classes and has built a community of 200+ regular participants.",
    tag: "Zumba",
    date: "January 2024",
    image:
      "https://",
  },
  {
    title: "Aditya Kumar, 19",
    subtitle: "College Band Leader",
    desc: "Aditya formed his college band after mastering drums at DUNAMIS and has performed at multiple inter-college festivals and won competitions.",
    tag: "Drums",
    date: "November 2023",
    image:
      "https://",
  },
];

export default function SuccessStories() {
  const router = useRouter();

  return (
    <section className="py-16">
      <div className="max-w-8xl mx-auto px-6 text-center">
        {/* Title */}
        <motion.p
          className="text-[#FF6B35] font-medium"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: false }}
        >
          Celebrating achievements
        </motion.p>

        <motion.h1
          className="text-2xl sm:text-3xl md:text-3xl font-bold mt-2 text-[#2D2D2D]"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: false }}
        >
          Success Stories
        </motion.h1>

        <motion.p
          className="text-gray-600 mt-2 max-w-2xl mx-auto text-xl"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: false }}
        >
          Inspiring journeys of our students who have achieved remarkable
          milestones with DUNAMIS. Their success is our greatest achievement.
        </motion.p>
        
      <section className="md:grid-cols-3 gap-6 px-2 md:px-12 pb-16 mt-12">
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center mb-12 max-w-3xl mx-auto">
    
    {/* Box 1 */}
    <div className="flex flex-col items-center">
      <h3 className="text-3xl md:text-3xl font-bold text-orange-600">150+</h3>
      <p className="text-gray-600 text-sm md:text-base">Certifications Earned</p>
    </div>

    {/* Box 2 */}
    <div className="flex flex-col items-center">
      <h3 className="text-3xl md:text-3xl font-bold text-[#47c9c4]">85%</h3>
      <p className="text-gray-600 text-sm md:text-base">Trinity Exam Pass Rate</p>
    </div>

    {/* Box 3 */}
    <div className="flex flex-col items-center">
      <h3 className="text-3xl md:text-3xl font-bold text-green-500">50+</h3>
      <p className="text-gray-600 text-sm md:text-base">Competition Winners</p>
    </div>

  </div>
</section>
        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-8 -mt-20 px-2 pl-10 pr-10">
          {stories.map((story, i) => (
            <motion.div
              key={i}
              className="bg-white border rounded-2xl shadow-md hover:shadow-xl transition overflow-hidden flex flex-col"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.2 }}
              viewport={{ once: false }}
            >
              {/* Image */}
              <div className="relative h-48 w-full overflow-hidden">
                <img
                  src={story.image}
                  alt={story.title}
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                />
                <span className="absolute top-3 left-3 bg-orange-600 text-white text-xs px-3 py-1 rounded-full shadow">
                  {story.tag}
                </span>
              </div>

              {/* Content */}
              <div className="p-5 flex flex-col flex-grow">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-500">{story.date}</span>
                </div>
                <h3 className="font-bold text-lg">{story.title}</h3>
                <p className="text-orange-600 text-sm font-medium mb-2">
                  {story.subtitle}
                </p>
                <p className="text-gray-600 text-sm flex-grow">{story.desc}</p>
                <a
                  href="#"
                  className="mt-4 inline-block text-orange-500 font-medium text-sm hover:underline"
                >
                  Read Full Story →
                </a>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          className="mt-16 bg-orange-50 rounded-xl py-10 px-6"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: false }}
        >
          <h3 className="text-xl md:text-2xl font-bold">
            Your Success Story Starts Here
          </h3>
          <p className="text-gray-600 mt-2">
            Join our community and become the next success story. With
            dedication and our guidance, achieve your creative goals.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 justify-center">
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => router.push("/courses")}
              className="cursor-pointer border border-orange-500 bg-orange-500 text-white transition-all duration-300 ease-in-out px-6 py-2 rounded-full"
            >
              Start Your Journey
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => router.push("/contact")}
              className="text-[#47c9c4] cursor-pointer border border-[#47c9c4] hover:text-white hover:bg-[#47c9c4] transition-all duration-300 ease-in-out px-6 py-2 rounded-full"
            >
              Share Your Story
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
