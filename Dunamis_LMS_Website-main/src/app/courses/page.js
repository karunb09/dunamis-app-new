"use client";

import Link from "next/link";
import { Search, SlidersHorizontal, X, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCourses } from "@/store/courseSlice";
import { IoMdStar } from "react-icons/io";
import { resolveImageUrl } from "@/lib/resolveImageUrl";

export default function CoursesPage() {
  const dispatch = useDispatch();
  const courseState = useSelector((state) => state.course);
  const courses = courseState.courses || [];
  const loading = courseState.loading;
  const error = courseState.error;

  const [transformedCourses, setTransformedCourses] = useState([]);
  const [search, setSearch] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedMode, setSelectedMode] = useState("");
  const [maxPrice, setMaxPrice] = useState(10000);

  // Transform API data for UI
  const transformCourses = (rawCourses) => {
    if (!Array.isArray(rawCourses)) return [];
    return rawCourses
      .filter((course) => course?.isPublished !== false)
      .map((course) => {
      const selectedPrice = Array.isArray(course.price)
        ? course.price.find((p) => p.isSelected) || course.price[0]
        : null;

      const image = resolveImageUrl(
        course.image,
        `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
          course.name || "Course"
        )}`
      );

      return {
        id: course._id,
        title: course.name || "Untitled Course",
        category: course.category?.name || "Not specified",
        level: course.level || "Beginner",
        mode: course.mode || "online",
        duration:
          course.startDate && course.endDate
            ? `${new Date(course.startDate).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              })} - ${new Date(course.endDate).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              })}`
            : "Duration not specified",
        price: selectedPrice?.monthlyFee || selectedPrice?.fullPayment || 0,
        image,
        rating: course.rating || 4.8,
        tags: [course.category?.name, course.level].filter(Boolean),
        type:
          course.certification === "certification"
            ? "Certificate Course"
            : "Regular Course",
        mentor: course.teacher?.[0]?.teacherDetail?.name
          ? `${course.teacher[0].teacherDetail.name.firstName} ${course.teacher[0].teacherDetail.name.lastName}`
          : "Expert Instructor",
        totalStudents: course.totalStudents || 0,
      };
    });
  };

  // Fetch courses from Redux
  useEffect(() => {
    dispatch(fetchCourses());
  }, [dispatch]);

  // Transform courses when Redux updates
  useEffect(() => {
    if (courses && courses.length > 0) {
      setTransformedCourses(transformCourses(courses));
    } else {
      setTransformedCourses([]);
    }
  }, [courses]);

  // Filters
  const filteredCourses = transformedCourses.filter((course) => {
    const matchesSearch = course.title
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesCategory = selectedCategory
      ? course.category === selectedCategory
      : true;
    const matchesMode = selectedMode ? course.mode === selectedMode : true;
    const matchesPrice = course.price <= maxPrice;
    return matchesSearch && matchesCategory && matchesMode && matchesPrice;
  });

  const categories = [
    ...new Set(transformedCourses.map((c) => c.category).filter(Boolean)),
  ];

  // Loading state
  if (loading)
    return (
      <section className="mx-auto flex max-w-7xl flex-col items-center justify-center px-6 py-12">
        <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-lg text-gray-600">Loading courses...</p>
      </section>
    );

  // Main Page
  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-extrabold">All Courses</h1>
        <p className="text-gray-600 mt-2">
          Discover your passion with our range of Music, Dance, and Language
          courses
        </p>
      </div>

      {/* Search + Filter */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div className="flex items-center w-full sm:w-1/3 border rounded-2xl px-3 py-2 bg-white shadow-sm">
          <Search className="w-4 h-4 text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full outline-none text-sm"
          />
        </div>
        <button
          onClick={() => setShowFilter(true)}
          className="flex items-center gap-2 px-4 py-2 border rounded-2xl text-sm hover:bg-gray-100 transition bg-white"
        >
          <SlidersHorizontal className="w-4 h-4" /> Filter
        </button>
      </div>

      {/* Filter Modal */}
      <AnimatePresence>
        {showFilter && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowFilter(false)}
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowFilter(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-semibold mb-4">Filter Courses</h2>

              {/* Category Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mode Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Mode</label>
                <select
                  value={selectedMode}
                  onChange={(e) => setSelectedMode(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">All Modes</option>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                </select>
              </div>

              {/* Price Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-1">
                  Max Price: ₹{maxPrice.toLocaleString()}
                </label>
                <input
                  type="range"
                  min="0"
                  max="10000"
                  step="500"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>₹0</span>
                  <span>₹10,000</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedCategory("");
                    setSelectedMode("");
                    setMaxPrice(10000);
                  }}
                  className="flex-1 border text-gray-700 py-2 rounded-2xl hover:bg-gray-50"
                >
                  Reset
                </button>
                <button
                  onClick={() => setShowFilter(false)}
                  className="flex-1 bg-orange-500 text-white py-2 rounded-2xl hover:bg-orange-600"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Courses Grid */}
      {!error && transformedCourses.length > 0 && (
        <p className="text-sm text-gray-600 mb-4">
          {filteredCourses.length} course{filteredCourses.length !== 1 ? "s" : ""}{" "}
          found
        </p>
      )}

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {filteredCourses.map((course, index) => (
          <motion.div
            key={course.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="bg-white border rounded-2xl shadow-lg overflow-hidden hover:shadow-xl hover:-translate-y-1 transition"
          >
            <div className="relative w-full h-48 overflow-hidden bg-gray-100">
              <img
                src={course.image}
                alt={course.title}
                className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                // onError={(e) => {
                //   e.target.src = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
                //     course.title
                //   )}`;
                // }}
              />
            </div>

            <div className="p-5 flex flex-col flex-grow">
              <div className="flex gap-2 flex-wrap mb-3">
                {(course.tags || []).map((tag, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex items-start justify-between mb-2 gap-2">
                <h3 className="font-bold text-lg text-gray-900 line-clamp-2">
                  {course.title}
                </h3>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                    course.mode === "online"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  ● {course.mode}
                </span>
              </div>

              <p className="text-sm text-gray-600 mb-1">
                Learn from <span className="font-medium">{course.mentor}</span>
              </p>
              <p className="text-xs text-gray-500 mb-3">{course.duration}</p>

              <div className="flex items-center justify-between text-sm mb-3 pb-3 border-b">
                <span className="font-bold text-black-500">₹{course.price}/month</span>
                <span className="flex items-center gap-1">
                  <IoMdStar className="w-4 h-4 text-yellow-500" /> {course.rating}
                </span>
              </div>

              <Link href={`/courses/${course.id}`}>
                <button className="cursor-pointer w-full bg-[#FF6B35] hover:bg-[#ff4400] text-white font-medium py-2 px-4 rounded-xl transition">
                  View Details
                </button>
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
