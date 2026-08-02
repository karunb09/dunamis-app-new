"use client";

import { useEffect } from "react";
import { notFound, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import { fetchOfflineCenters } from "@/store/centerSlice";
import {
  FaWifi, FaParking, FaSnowflake, FaCoffee, FaDumbbell, FaBook, FaProjectDiagram, FaPhoneAlt} from "react-icons/fa";
import { LuMapPin, LuClock, LuUsers, LuMail, LuPhone, LuChevronLeft, LuCircleCheck, LuBookOpen } from "react-icons/lu";
import Link from "next/link";
import { resolveImageUrl } from "@/lib/resolveImageUrl";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatCurrency = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0
    ? `₹${amount.toLocaleString("en-IN")}`
    : "";
};

const normalizeCourses = (courses = []) => {
  if (!Array.isArray(courses)) return [];
  const seen = new Set();
  return courses.reduce((acc, course, index) => {
    if (!course) return acc;
    const key =
      course._id || course.id || course.code || course.name || `course-${index}`;
    if (seen.has(key)) return acc;

    const activePrice = Array.isArray(course.price)
      ? course.price.find((p) => p?.isActive) || course.price[0]
      : null;
    const tenurePlans = (activePrice?.tenurePlans || []).filter(
      (p) => p?.isActive !== false
    );
    const primaryPlan =
      tenurePlans.find((p) => p?.months === 6) || tenurePlans[0];
    const monthlyFee = primaryPlan?.monthlyFee || activePrice?.monthlyFee;

    seen.add(key);
    acc.push({
      key,
      id: course._id || course.id || "",
      name: course.name || course.courseName || `Course ${index + 1}`,
      code: course.code || course.courseCode || "",
      description: course.description || "",
      level: course.level || "",
      price: formatCurrency(monthlyFee || activePrice?.fullPayment),
      priceSuffix: monthlyFee ? "/month" : "",
    });
    return acc;
  }, []);
};

const facilityIconMap = {
  WiFi: <FaWifi />,
  "Wi-Fi": <FaWifi />,
  Parking: <FaParking />,
  "Air Conditioning": <FaSnowflake />,
  Cafeteria: <FaCoffee />,
  Gym: <FaDumbbell />,
  Library: <FaBook />,
  Projector: <FaProjectDiagram />,
  Projectors: <FaProjectDiagram />,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoCard({ icon, label, value }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.45 }}
      className="flex items-start gap-4 rounded-2xl bg-white p-5 shadow-sm border border-gray-100"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          {label}
        </p>
        <p className="mt-0.5 break-words text-sm font-medium text-gray-800">{value}</p>
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CenterDetailClient({ initialCenters = [] }) {
  const dispatch = useDispatch();
  const params = useParams();
  const slug = params?.slug;

  const {
    centers: storeCenters = [],
    loading = false,
    error = null,
  } = useSelector((state) => state.offlineCenters || {});
  // Seed from the server-fetched centres so the first (SSR) render has content
  // and generateMetadata can emit per-centre SEO tags.
  const centers = storeCenters.length ? storeCenters : initialCenters;

  useEffect(() => {
    if (!storeCenters.length) {
      dispatch(fetchOfflineCenters());
    }
  }, [dispatch, storeCenters.length]);

  const transformedCenters = centers.map((apiCenter) => ({
    id: apiCenter._id,
    name: apiCenter.branchName,
    slug: apiCenter.branchName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, ""),
    address: `${apiCenter.location}${
      apiCenter.city?.cityName ? ", " + apiCenter.city.cityName : ""
    }`,
    city: apiCenter.city?.cityName || "",
    description: `${apiCenter.branchName} offers quality education with modern facilities and expert instructors.`,
    image: resolveImageUrl(
      apiCenter.branchImage,
      `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(
        apiCenter.branchName || "Branch"
      )}`
    ),
    isActive: apiCenter.status === "active",
    openingHours:
      apiCenter.branchTimings?.length >= 2
        ? `${apiCenter.branchOpenDays?.join(", ") || "Mon-Fri"}: ${
            apiCenter.branchTimings[0]
          } – ${apiCenter.branchTimings[1]}`
        : "Mon – Sat: 9 AM – 6 PM",
    capacity: `${apiCenter.branchCapacity || 100} students`,
    contactPhone: apiCenter.branchAdminContact || "+91 93982 46083",
    email: apiCenter.branchAdminEmail || "contact@example.com",
    facilities: apiCenter.centreFacilities
      ? apiCenter.centreFacilities.split(",").map((f) => f.trim())
      : [],
    courses: normalizeCourses(apiCenter.courses),
    zone: apiCenter.zone?.name || "",
  }));

  const center = transformedCenters.find((c) => c.slug === slug);

  // ── Loading ──────────────────────────────────────────────────────────────
  // Only show the skeleton when we have nothing seeded yet — avoids a
  // content -> skeleton -> content flash after hydration.
  if (loading && !center) {
    return (
      <div className="min-h-screen">
        {/* Hero skeleton */}
        <div className="relative h-72 md:h-96 lg:h-[430px] w-full bg-gray-200 animate-pulse" />
        <div className="mx-auto max-w-7xl px-6 py-12 space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/2 animate-pulse" />
          <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse" />
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => dispatch(fetchOfflineCenters())}
            className="bg-[#CC3700] text-white px-6 py-2 rounded-2xl hover:bg-[#B83100] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!loading && !center) {
    notFound();
  }

  const {
    isActive,
    name,
    description,
    image,
    address,
    city,
    openingHours,
    capacity,
    contactPhone,
    email,
    facilities = [],
    courses = [],
  } = center || {};

  return (
    <div className="min-h-screen bg-[#fffaf4]">
      {/* ── Full-width hero with gradient overlay ──────────────────────── */}
      <div className="relative h-72 md:h-96 lg:h-[430px] overflow-hidden">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src =
              "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80";
          }}
        />
        {/* Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />

        {/* Back button — glass pill top-left */}
        <Link
          href="/centers"
          className="absolute top-5 left-5 flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/25 transition-colors"
        >
          <LuChevronLeft className="w-4 h-4" /> All Centres
        </Link>

        {/* Active badge */}
        {isActive && (
          <span className="absolute top-5 right-5 flex items-center gap-1.5 rounded-full bg-emerald-500/90 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            Active
          </span>
        )}

        {/* Centre info overlaid at bottom of hero */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {city && (
              <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-orange-500/80 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                <LuMapPin className="w-3 h-3" /> {city}
              </span>
            )}
            <h1 className="mt-2 text-3xl md:text-5xl font-extrabold text-white leading-tight">
              {name}
            </h1>
            <p className="mt-2 text-sm md:text-base text-white/70 max-w-2xl line-clamp-2">
              {description}
            </p>
          </motion.div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-6 py-12 space-y-14">

        {/* Info cards row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <InfoCard icon={<LuMapPin className="w-5 h-5" />} label="Address" value={address} />
          <InfoCard icon={<LuClock className="w-5 h-5" />} label="Hours" value={openingHours} />
          <InfoCard icon={<LuUsers className="w-5 h-5" />} label="Capacity" value={capacity} />
          <InfoCard icon={<LuPhone className="w-5 h-5" />} label="Phone" value={contactPhone} />
          <InfoCard icon={<LuMail className="w-5 h-5" />} label="Email" value={email} />
        </div>

        {/* Facilities */}
        {facilities.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-5 flex items-center gap-2">
              <LuCircleCheck className="w-6 h-6 text-orange-500" />
              Facilities &amp; Amenities
            </h2>
            <div className="flex flex-wrap gap-3">
              {facilities.map((f, i) => (
                <span
                  key={i}
                  className="flex items-center gap-2 rounded-xl border border-teal-100 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-800"
                >
                  <span className="text-teal-600">
                    {facilityIconMap[f] || <FaWifi />}
                  </span>
                  {f}
                </span>
              ))}
            </div>
          </motion.section>
        )}

        {/* Courses */}
        <section>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
            className="text-2xl font-bold text-gray-900 mb-5 flex items-center gap-2"
          >
            <LuBookOpen className="w-6 h-6 text-orange-500" />
            Available Courses
          </motion.h2>

          {courses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {courses.map((course, idx) => (
                <motion.div
                  key={course.key}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.4, delay: idx * 0.06 }}
                  className="group flex h-full flex-col rounded-2xl border border-orange-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 min-h-[56px]">
                    <div>
                      <h3 className="line-clamp-2 text-base font-semibold text-gray-900">
                        {course.name}
                      </h3>
                      {course.code && (
                        <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                          {course.code}
                        </p>
                      )}
                    </div>
                    {course.level && (
                      <span className="shrink-0 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold capitalize text-orange-600 border border-orange-100">
                        {course.level}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-gray-500">
                    {course.description ||
                      "Course details are available from this centre."}
                  </p>

                  {/* Footer */}
                  <div className="mt-auto flex items-center justify-between gap-3 pt-4 border-t border-gray-50">
                    <p className="text-sm font-semibold text-gray-800">
                      {course.price
                        ? `${course.price}${course.priceSuffix}`
                        : "Contact for pricing"}
                    </p>
                    {course.id && (
                      <Link
                        href={`/courses/${course.id}`}
                        className="shrink-0 rounded-full bg-[#CC3700] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#B83100] transition-colors"
                      >
                        View Course
                      </Link>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-gray-200 bg-white px-8 py-10 text-center text-sm text-gray-400">
              No courses are assigned to this centre yet.
            </p>
          )}
        </section>

        {/* Book a visit CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.55 }}
          className="rounded-2xl overflow-hidden bg-gradient-to-br from-[#FF6B35] to-[#ff4400] p-8 md:p-12 text-white text-center"
        >
          <h3 className="text-2xl md:text-3xl font-bold">
            Ready to visit {name}?
          </h3>
          <p className="mt-3 text-white/80 max-w-xl mx-auto">
            Come in for a free trial class, meet the instructors, and experience
            the space before enrolling.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={`tel:${contactPhone}`}
              className="rounded-full bg-white text-orange-600 font-semibold px-6 py-3 text-sm hover:bg-orange-50 transition-colors flex items-center justify-center gap-2"
            >
              <LuPhone className="w-4 h-4" /> Call Now
            </a>
            <a
              href={`mailto:${email}`}
              className="rounded-full border-2 border-white/60 text-white font-semibold px-6 py-3 text-sm hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
            >
              <LuMail className="w-4 h-4" /> Email Us
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
