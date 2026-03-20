"use client";

import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { GoArrowUpRight } from "react-icons/go";
import { IoMdStar } from "react-icons/io";
import { fetchMentors } from "@/store/mentorSlice";
import { IMAGE_BASE_URL } from "@/lib/siteConfig";

export default function Mentors() {
    const dispatch = useDispatch();
    const { mentors, loading, error } = useSelector((state) => state.mentor);

    const getImageUrl = (imagePath, fallbackName = "Unknown") => {
        if (!imagePath) {
            return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(fallbackName)}`;
        }

        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
            return imagePath;
        }

        const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
        return `${IMAGE_BASE_URL}${cleanPath}`;
    };

    // Transform mentors with API data
    const transformMentors = (rawMentors) => {
        if (!Array.isArray(rawMentors)) return [];

        const uniqueMentors = new Map();

        rawMentors.forEach((m) => {
            const user = m.user || {};
            const teacherApp = m.teacherApplication || {};
            const course = (m.courses && m.courses[0]) || {};
            const attendance = m.attendanceHistory?.[0] || {};

            const firstName = teacherApp.name?.firstName || user.name?.firstName || "";
            const lastName = teacherApp.name?.lastName || user.name?.lastName || "";
            const fullName = `${firstName} ${lastName}`.trim();

            // Get profile picture from teacherApplication or fallback to user image
            const rawImage = teacherApp.profilePicture || user.image;
            const profileImage = getImageUrl(rawImage, fullName || "Unknown");

            // Format languages
            const languages = {
                read: teacherApp.language?.read || [],
                speak: teacherApp.language?.speak || []
            };

            const mentor = {
                id:
                    m._id ||
                    user._id ||
                    teacherApp._id ||
                    `${fullName}-${teacherApp.areaOfExpertise || "mentor"}`,
                name: fullName || "Unknown",
                image: profileImage,
                experience: teacherApp.yearOfExperience
                    ? `${teacherApp.yearOfExperience} years`
                    : "Experience not specified",
                expertiseArea: teacherApp.areaOfExpertise || "Not specified",
                currentCTC: teacherApp.currentCTC ? `${teacherApp.currentCTC}` : "N/A",
                expectedCTC: teacherApp.expectedCTC ? `${teacherApp.expectedCTC}` : "N/A",
                availability: Array.isArray(teacherApp.availability)
                    ? teacherApp.availability.join(", ")
                    : teacherApp.availability || "Not specified",
                rating: m.averageRating || 0,
                studentCount: m.studentCount || 0,
                courseName: course.name || "N/A",
                courseCategory: attendance.courseCategory || "N/A",
                slot: attendance.slot || "Not specified",
                sessionType: attendance.sessionType || teacherApp.mode || "Not specified",
                gender: teacherApp.gender || "Not specified",
                languages: languages,
                highestQualification: teacherApp.highestQualification || "Not specified",
                courses: m.courses || [],
                tags: [teacherApp.areaOfExpertise, attendance.courseCategory].filter(Boolean),
                description: teacherApp.areaOfExpertise || "No description available",
            };

            if (!uniqueMentors.has(mentor.id)) {
                uniqueMentors.set(mentor.id, mentor);
            }
        });

        return Array.from(uniqueMentors.values());
    };

    const transformedMentors = transformMentors(mentors);

    const [currentSlide, setCurrentSlide] = useState(0);
    const [cardsPerView, setCardsPerView] = useState(3);
    const [direction, setDirection] = useState(1);
    const [selectedCard, setSelectedCard] = useState(null);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        dispatch(fetchMentors());
    }, [dispatch]);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 640) setCardsPerView(1);
            else if (window.innerWidth < 1024) setCardsPerView(2);
            else setCardsPerView(3);
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const totalSlides =
        transformedMentors.length > 0 ? Math.max(1, Math.ceil(transformedMentors.length / cardsPerView)) : 1;

    useEffect(() => {
        if (currentSlide > totalSlides - 1) {
            setCurrentSlide(0);
            setSelectedCard(null);
        }
    }, [currentSlide, totalSlides]);

    useEffect(() => {
        if (totalSlides <= 1 || isHovered) return;

        const interval = setInterval(() => {
            setDirection(1);
            setCurrentSlide((prev) => (prev + 1) % totalSlides);
            setSelectedCard(null);
        }, 3000);

        return () => clearInterval(interval);
    }, [totalSlides, isHovered]);

    // Loading and error states
    if (loading || error || transformedMentors.length === 0) return null;

    const nextSlide = () => {
        setDirection(1);
        setCurrentSlide((prev) => (prev + 1) % totalSlides);
        setSelectedCard(null);
    };

    const prevSlide = () => {
        setDirection(-1);
        setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
        setSelectedCard(null);
    };

    const goToSlide = (i) => {
        setDirection(i > currentSlide ? 1 : -1);
        setCurrentSlide(i);
        setSelectedCard(null);
    };

    const getCurrentMentors = () => {
        if (!Array.isArray(transformedMentors) || transformedMentors.length === 0) return [];

        if (transformedMentors.length <= cardsPerView) {
            return transformedMentors;
        }

        const start = currentSlide * cardsPerView;
        const end = start + cardsPerView;

        if (start >= transformedMentors.length) {
            return transformedMentors.slice(0, cardsPerView);
        }

        return transformedMentors.slice(start, end);
    };

    const variants = {
        enter: (dir) => ({
            x: dir > 0 ? 120 : -120,
            opacity: 0,
            scale: 0.98,
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
            scale: 1,
            transition: { duration: 0.6, ease: "easeOut" },
        },
        exit: (dir) => ({
            zIndex: 0,
            x: dir > 0 ? -120 : 120,
            opacity: 0,
            scale: 0.98,
            transition: { duration: 0.6, ease: "easeIn" },
        }),
    };

    return (
        <div>
            <section className="bg-[#F5F5F5] py-16 px-6 relative">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <motion.div
                        className="text-center mb-10"
                        initial={{ opacity: 0, y: -20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <p className="text-[#FF6B35] font-medium mb-2">Learn from the Best</p>
                        <h2 className="text-3xl sm:text-4xl font-bold text-[#2D2D2D] mb-3">Meet Your Mentors</h2>
                        <p className="text-[#2D2D2D] opacity-70 max-w-2xl mx-auto">
                            Our expert instructors bring years of professional experience and a passion for teaching. They're here
                            to guide you on your creative journey with personalized attention and proven methods.
                        </p>
                    </motion.div>

                    {/* Carousel */}
                    <div
                        className="relative overflow-hidden"
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                    >
                        <div className="relative">
                            <AnimatePresence mode="wait" custom={direction}>
                                <motion.div
                                    key={currentSlide}
                                    custom={direction}
                                    variants={variants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    className="flex gap-6 justify-center items-start"
                                >
                                    {getCurrentMentors().map((mentor, idx) => {
                                        const globalIndex = (currentSlide * cardsPerView + idx) % transformedMentors.length;
                                        const isSelected = selectedCard === globalIndex;

                                        return (
                                            <motion.div
                                                key={mentor.id}
                                                className="bg-white group relative flex flex-col w-full max-w-[320px] shadow-sm border border-gray-200 rounded-xl overflow-hidden cursor-pointer"
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.45, delay: idx * 0.06 }}
                                                whileHover={{ scale: 1.02, y: -6 }}
                                                onClick={() => setSelectedCard(isSelected ? null : globalIndex)}
                                            >
                                                {/* Image block */}
                                                <div className="flex justify-center items-center w-full h-[220px] p-6 transition-all duration-500">
                                                    <div className="h-[140px] w-[140px] rounded-full overflow-hidden border-4 border-blue-50 transition-all duration-500">
                                                        <img
                                                            src={mentor.image}
                                                            alt={mentor.name}
                                                            className="object-cover h-full w-full"
                                                            loading="lazy"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Basic content */}
                                                <div className="p-5 text-center flex-1 flex flex-col justify-start gap-3">
                                                    <h3 className="font-semibold text-lg text-gray-800">{mentor.name}</h3>
                                                    <div className="flex flex-wrap justify-center gap-2">
                                                        {mentor.tags.map((t, i) => (
                                                            <span
                                                                key={i}
                                                                className="bg-[#FF6B35] text-white text-xs px-3 py-1 rounded-full font-medium"
                                                            >
                                                                {t}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <p className="text-sm text-gray-700 opacity-90 mt-2 line-clamp-3">{mentor.description}</p>

                                                    <div className="flex justify-between items-center text-sm text-gray-700 font-medium pt-3">
                                                        <span>{mentor.experience}</span>

                                                        <div className="flex items-center text-sm gap-2 text-gray-700">
                                                            <div className="flex">
                                                                <IoMdStar className="text-amber-500" />
                                                            </div>
                                                            <span>{mentor.rating > 0 ? mentor.rating.toFixed(1) : "0"}</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-center gap-2 text-xs text-gray-600 mt-2">
                                                        <span>{mentor.studentCount} {mentor.studentCount === 1 ? 'Student' : 'Students'}</span>
                                                        <span>•</span>
                                                        <span className="capitalize">{mentor.sessionType}</span>
                                                    </div>
                                                </div>

                                                {/* Overlay details */}
                                                <motion.div
                                                    className={`absolute inset-0 bg-white/95 p-4 flex flex-col justify-center overflow-y-auto pointer-events-none transition-all duration-300 ${isSelected
                                                        ? "opacity-100 pointer-events-auto"
                                                        : "opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto"
                                                        }`}
                                                    initial={{ y: 12 }}
                                                    animate={{ y: 0 }}
                                                    transition={{ duration: 0.25 }}
                                                >
                                                    <div className="p-3 rounded-lg space-y-3">
                                                        <div className="space-y-2 text-left text-xs">
                                                            {/* Gender & Qualification */}
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <h4 className="font-semibold text-[#FF6B35] text-xs mb-1">Gender</h4>
                                                                    <p className="text-xs text-gray-700 capitalize">{mentor.gender}</p>
                                                                </div>
                                                                <div>
                                                                    <h4 className="font-semibold text-[#FF6B35] text-xs mb-1">Students</h4>
                                                                    <p className="text-xs text-gray-700">{mentor.studentCount}</p>
                                                                </div>
                                                            </div>

                                                            {/* Qualification */}
                                                            <div>
                                                                <h4 className="font-semibold text-[#FF6B35] text-xs mb-1">Qualification</h4>
                                                                <p className="text-xs text-gray-700">{mentor.highestQualification}</p>
                                                            </div>

                                                            {/* Languages */}
                                                            <div>
                                                                <h4 className="font-semibold text-[#FF6B35] text-xs mb-1">Languages</h4>
                                                                <p className="text-xs text-gray-700">
                                                                    Speak: {mentor.languages.speak.join(", ") || "N/A"}
                                                                    <br />
                                                                    Read: {mentor.languages.read.join(", ") || "N/A"}
                                                                </p>
                                                            </div>

                                                            {/* Course Category & Slot */}
                                                            <div>
                                                                <h4 className="font-semibold text-[#FF6B35] text-xs mb-1">Course Category</h4>
                                                                <p className="text-xs text-gray-700">{mentor.courseCategory}</p>
                                                            </div>

                                                            <div>
                                                                <h4 className="font-semibold text-[#FF6B35] text-xs mb-1">Available Slot</h4>
                                                                <p className="text-xs text-gray-700">{mentor.slot}</p>
                                                            </div>

                                                            {/* Session Type & Mode */}
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <h4 className="font-semibold text-[#FF6B35] text-xs mb-1">Mode</h4>
                                                                    <p className="text-xs text-gray-700 capitalize">{mentor.sessionType}</p>
                                                                </div>
                                                                <div>
                                                                    <h4 className="font-semibold text-[#FF6B35] text-xs mb-1">Rating</h4>
                                                                    <p className="text-xs text-gray-700 flex items-center gap-1">
                                                                        <IoMdStar className="text-amber-500" />
                                                                        {mentor.rating > 0 ? mentor.rating.toFixed(1) : "0"}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {/* Courses */}
                                                            {mentor.courses.length > 0 && (
                                                                <div>
                                                                    <h4 className="font-semibold text-[#FF6B35] text-xs mb-1">Courses</h4>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {mentor.courses.map((course, i) => (
                                                                            <span
                                                                                key={i}
                                                                                className="bg-[#FF6B35]/10 text-[#FF6B35] px-2 py-1 rounded-full text-xs font-medium"
                                                                            >
                                                                                {course.name}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Availability */}
                                                            <div>
                                                                <h4 className="font-semibold text-[#FF6B35] text-xs mb-1">Availability</h4>
                                                                <p className="text-xs text-gray-700">{mentor.availability}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>

                                                {/* Hover icon */}
                                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                    <div className="bg-[#FF6B35] text-white rounded-full p-1">
                                                        <GoArrowUpRight className="w-3 h-3" />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Arrows */}
                        {totalSlides > 1 && (
                            <>
                                <motion.button
                                    onClick={prevSlide}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 -translate-x-2 z-10 bg-white p-2 rounded-full shadow hover:bg-gray-100"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    aria-label="Previous slide"
                                >
                                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                                </motion.button>
                                <motion.button
                                    onClick={nextSlide}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 translate-x-2 z-10 bg-white p-2 rounded-full shadow hover:bg-gray-100"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    aria-label="Next slide"
                                >
                                    <ChevronRight className="w-5 h-5 text-gray-600" />
                                </motion.button>
                            </>
                        )}

                        {/* Dots */}
                        {totalSlides > 1 && (
                            <div className="flex justify-center items-center gap-2 mt-8">
                                {Array.from({ length: totalSlides }).map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => goToSlide(i)}
                                        className={`rounded-full transition-all duration-300 ${currentSlide === i ? "bg-[#FF6B35] w-6 h-3 rounded-full" : "bg-gray-300 w-3 h-3"
                                            }`}
                                        aria-label={`Go to slide ${i + 1}`}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Slide counter */}
                        {totalSlides > 1 && (
                            <div className="text-center mt-4 text-sm text-gray-500">
                                {currentSlide + 1} of {totalSlides}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <motion.section
                className="bg-teal-100 text-gray-800 py-16 px-4 text-center"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
            >
                <div className="max-w-3xl mx-auto">
                    <p className="text-2xl md:text-3xl font-bold leading-relaxed">
                        "Every expert was once a beginner. Every professional was once an amateur. Every icon was once an unknown."
                    </p>
                    <p className="text-black/80 mt-4">— Robin Sharma</p>
                </div>
            </motion.section>
        </div>
    );
}
