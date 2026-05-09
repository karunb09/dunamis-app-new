"use client";
import OfflineHero from "@/compoents/OfllineHero";
import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Clock, Users } from "lucide-react";
import { GiMusicalNotes } from "react-icons/gi";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchOfflineCenters } from "@/store/centerSlice";
import { resolveImageUrl } from "@/lib/resolveImageUrl";

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

const normalizeCity = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const getCourseKey = (course, index) => {
  if (typeof course === "string") return course;
  return course?._id || course?.id || course?.code || course?.name || `course-${index}`;
};

const getCourseLabel = (course, index) => {
  if (typeof course === "string") return course.trim();

  const name = String(course?.name || course?.courseName || "").trim();
  const code = String(course?.code || course?.courseCode || "").trim();

  if (name && code) return `${name} (${code})`;
  if (name) return name;
  if (code) return code;

  const id = String(course?._id || course?.id || "").trim();
  return id ? `Course ${index + 1}` : "";
};

const normalizeCourses = (courses = []) => {
  if (!Array.isArray(courses)) return [];

  const seen = new Set();

  return courses.reduce((acc, course, index) => {
    const label = getCourseLabel(course, index);
    if (!label) return acc;

    const key = getCourseKey(course, index);
    if (seen.has(key)) return acc;

    seen.add(key);
    acc.push({ key, label });
    return acc;
  }, []);
};

export default function Centers() {
  const dispatch = useDispatch();
  const offlineCenterState = useSelector((state) => state.offlineCenters || {});
  const centers = offlineCenterState.centers || [];
  const loading = offlineCenterState.loading || false;
  const error = offlineCenterState.error || null;

  const [selectedCity, setSelectedCity] = useState("all");

  useEffect(() => {
    dispatch(fetchOfflineCenters());
  }, [dispatch]);

  const heroStats = useMemo(() => {
    const cityKeys = new Set();
    const teacherKeys = new Set();
    const studentKeys = new Set();
    let studentCount = 0;

    (Array.isArray(centers) ? centers : []).forEach((center) => {
      const cityName = String(center.city?.cityName || center.city || "").trim();
      if (cityName) cityKeys.add(normalizeCity(cityName));

      (center.teachers || []).forEach((teacher, index) => {
        const teacherKey = teacher?._id || teacher?.id || teacher?.userId?._id || `${center._id}-teacher-${index}`;
        if (teacherKeys.has(teacherKey)) return;

        teacherKeys.add(teacherKey);

        if (Array.isArray(teacher?.students) && teacher.students.length > 0) {
          teacher.students.forEach((student) => {
            const studentKey = student?._id || student?.id || student;
            if (studentKey) studentKeys.add(String(studentKey));
          });
        } else {
          studentCount += Number(teacher?.studentCount) || 0;
        }
      });
    });

    return {
      cities: cityKeys.size,
      students: studentKeys.size || studentCount,
      instructors: teacherKeys.size,
    };
  }, [centers]);

  const transformedCenters = useMemo(() => {
    if (centers && centers.length > 0) {
      return centers.map((center) => {
        const formattedTimings =
          center.branchTimings && center.branchTimings.length >= 2
            ? `${center.branchTimings[0]} - ${center.branchTimings[1]}`
            : "Mon - Sat: 9 AM - 6 PM";

        const openDays =
          center.branchOpenDays && center.branchOpenDays.length > 0
            ? center.branchOpenDays.join(", ")
            : "Mon-Fri";

        const availableCourses = normalizeCourses(
          center.courses && center.courses.length > 0
            ? center.courses
            : center.availableCourses || ["Music", "Dance"]
        );

        return {
          id: center._id || center.id,
          name: center.branchName || center.name || "Unnamed Center",
          city:
            center.city?.cityName ||
            center.city ||
            center.location?.city ||
            center.location ||
            "Unknown City",
          address:
            center.address ||
            `${center.location || ""}${
              center.city?.cityName ? ", " + center.city.cityName : ""
            }` ||
            "Address not available",
          description:
            center.description ||
            `${center.branchName || "This branch"} offers excellent training.`,
          image: resolveImageUrl(
            center.branchImage,
            `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(
              center.branchName || center.name || "Branch"
            )}`
          ),
          openingHours: `${openDays}: ${formattedTimings}`,
          capacity: center.branchCapacity
            ? `${center.branchCapacity} students`
            : "100 students",
          contactPhone:
            center.branchAdminContact ||
            center.branchManager?.contact ||
            center.contactPhone ||
            "+91 XXXXX XXXXX",
          email:
            center.branchAdminEmail ||
            center.branchManager?.email ||
            center.contactEmail ||
            "info@example.com",
          availableCourses,
          slug: (center.branchName || center.name || "center")
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .trim()
            .replace(/\s+/g, "-"),
        };
      });
    }
    return [];
  }, [centers]);

  const filteredCenters = useMemo(() => {
    if (selectedCity === "all") {
      return transformedCenters;
    }

    return transformedCenters.filter(
      (center) => normalizeCity(center.city) === selectedCity
    );
  }, [selectedCity, transformedCenters]);

  const cities = useMemo(() => {
    const map = new Map();

    transformedCenters.forEach((center) => {
      const label = String(center.city || "").trim();
      const key = normalizeCity(label);
      if (!key || map.has(key)) return;
      map.set(key, { value: key, label });
    });

    return [{ value: "all", label: "All Cities" }, ...Array.from(map.values())];
  }, [transformedCenters]);

  if (loading) {
    return (
      <section className="py-16 px-12 mx-auto">
        <OfflineHero stats={heroStats} />
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-lg text-gray-600">Loading centers...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-12 mx-auto">
      <OfflineHero stats={heroStats} />

      <div className="flex justify-between items-center mt-12 mb-6">
        <p className="text-gray-700">
          Showing {filteredCenters.length} centre
          {filteredCenters.length !== 1 ? "s" : ""}
        </p>
        <select
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2"
          aria-label="Filter branches by city"
        >
          {cities.map((city) => (
            <option key={city.value} value={city.value}>
              {city.label}
            </option>
          ))}
        </select>
      </div>

      <motion.div
        className="grid gap-8 md:grid-cols-2 lg:grid-cols-3"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {filteredCenters.map((center) => (
          <motion.div
            key={center.id}
            className="flex h-full cursor-pointer flex-col overflow-hidden rounded-xl bg-white shadow-md transition-shadow duration-300 hover:shadow-xl"
            variants={cardVariants}
          >
            <img
              src={center.image}
              alt={center.name}
              className="w-full h-48 object-cover"
              onError={(e) => {
                e.target.src =
                  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80";
              }}
            />
            <div className="flex flex-1 flex-col p-5">
              <h2 className="mb-2 min-h-[28px] line-clamp-1 text-lg font-semibold text-gray-900">
                {center.name}
              </h2>
              <p className="mb-3 flex min-h-[40px] items-start gap-1 text-sm text-gray-600">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#FF6B35]" />
                <span title={center.address} className="line-clamp-2">
                  {center.address}
                </span>
              </p>

              <div className="mb-4 grid min-h-[76px] grid-cols-1 gap-3 text-sm text-gray-700 sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#FF6B35]" />
                  <span className="truncate">{center.contactPhone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#FF6B35]" />
                  <span title={center.email} className="truncate">
                    {center.email.length > 15
                      ? `${center.email.substring(0, 15)}...`
                      : center.email}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#FF6B35]" />
                  <span className="truncate">{center.openingHours}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#FF6B35]" />
                  <span>{center.capacity}</span>
                </div>
              </div>

              <div className="mb-4 mt-2 min-h-[86px]">
                <div className="flex items-center gap-2 mb-2">
                  <GiMusicalNotes className="text-[#FF6B35] w-4 h-4" />
                  <span className="text-gray-800 text-sm font-medium">
                    Available Courses
                  </span>
                </div>
                <div className="flex max-h-[58px] flex-wrap gap-2 overflow-hidden">
                  {center.availableCourses.length > 0 ? (
                    center.availableCourses.slice(0, 3).map((course) => (
                      <span
                        key={course.key}
                        className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-xs font-medium"
                      >
                        {course.label.length > 24
                          ? `${course.label.substring(0, 24)}...`
                          : course.label}
                      </span>
                    ))
                  ) : (
                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                      No courses assigned
                    </span>
                  )}
                  {center.availableCourses.length > 3 && (
                    <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-xs font-medium">
                      +{center.availableCourses.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              <Link
                href={`/centers/${center.slug}`}
                className="mt-auto px-4 py-2 bg-[#FF6B35] text-white rounded-2xl text-center hover:bg-[#ff4400] transition"
              >
                View Details
              </Link>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="mt-16 py-10 px-6 rounded-xl text-center">
        <h3 className="text-xl font-semibold text-gray-900">
          Can&apos;t Find a Centre Near You?
        </h3>
        <p className="text-gray-600 mt-2">
          We&apos;re expanding! Let us know your location and we&apos;ll keep
          you updated on new centres.
        </p>
        <div className="flex flex-col md:flex-row gap-4 justify-center mt-6 max-w-lg mx-auto">
          <input
            type="text"
            placeholder="Enter your city"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2"
          />
          <button className="bg-[#FF6B35] hover:bg-[#ff4400] text-white px-6 py-2 rounded-2xl">
            Notify Me
          </button>
        </div>
      </div>
    </section>
  );
}
