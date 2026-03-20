"use client";

import React, { useEffect } from "react";
import { notFound } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { fetchOfflineCenters } from "@/store/centerSlice";
import {
  FaWifi,
  FaParking,
  FaSnowflake,
  FaCoffee,
  FaDumbbell,
  FaBook,
  FaProjectDiagram,
  FaMapMarkerAlt,
  FaEnvelope,
  FaClock,
  FaUsers,
  FaPhoneAlt,
} from "react-icons/fa";
import Link from "next/link";
import { resolveImageUrl } from "@/lib/resolveImageUrl";

export default function CenterDetailsPage({ params }) {
  const dispatch = useDispatch();

  const resolvedParams = React.use(params);
  const slug = resolvedParams?.slug;

  const {
    centers = [],
    loading = false,
    error = null,
  } = useSelector((state) => state.offlineCenters || {});

  useEffect(() => {
    if (!centers.length) {
      dispatch(fetchOfflineCenters());
    }
  }, [dispatch, centers.length]);

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
    description: `${apiCenter.branchName} offers quality education with modern facilities and expert instructors.`,
    image: resolveImageUrl(
      apiCenter.branchImage,
      `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(
        apiCenter.branchName || "Branch"
      )}`
    ),
    isFeatured: apiCenter.status === "active",
    openingHours:
      apiCenter.branchTimings?.length >= 2
        ? `${apiCenter.branchOpenDays?.join(", ") || "Mon-Fri"}: ${
            apiCenter.branchTimings[0]
          } - ${apiCenter.branchTimings[1]}`
        : "Mon - Sat: 9 AM - 6 PM",
    capacity: `${apiCenter.branchCapacity || 100} students`,
    contactPhone: apiCenter.branchAdminContact || "+91 98765 43210",
    email: apiCenter.branchAdminEmail || "contact@example.com",
    facilities: apiCenter.centreFacilities
      ? apiCenter.centreFacilities.split(",").map((f) => f.trim())
      : [],
    courses: [],
    instructors: apiCenter.branchManager
      ? [
          {
            name: `${apiCenter.branchManager.name.firstName} ${apiCenter.branchManager.name.lastName}`,
            avatar: "https://randomuser.me/api/portraits/men/45.jpg",
            tags: ["Branch Manager"],
            rating: "4.8",
            experience: "10+ years",
            bio: "Experienced branch manager dedicated to student success.",
          },
        ]
      : [],
    zone: apiCenter.zone?.name || "",
    city: apiCenter.city?.cityName || "",
  }));

  const center = transformedCenters.find((c) => c.slug === slug);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B35] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading center details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button
            onClick={() => dispatch(fetchOfflineCenters())}
            className="bg-[#FF6B35] text-white px-6 py-2 rounded-2xl hover:bg-[#ff4400]"
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
    isFeatured,
    name,
    description,
    image,
    address,
    openingHours,
    capacity,
    contactPhone,
    email,
    facilities = [],
    courses = [],
    instructors = [],
  } = center || {};

  const facilityIcons = {
    WiFi: <FaWifi className="w-4 h-4" />,
    Parking: <FaParking className="w-4 h-4" />,
    "Air Conditioning": <FaSnowflake className="w-4 h-4" />,
    Cafeteria: <FaCoffee className="w-4 h-4" />,
    Gym: <FaDumbbell className="w-4 h-4" />,
    Library: <FaBook className="w-4 h-4" />,
    Projectors: <FaProjectDiagram className="w-4 h-4" />,
    "Wi-Fi": <FaWifi className="w-4 h-4" />,
    Projector: <FaProjectDiagram className="w-4 h-4" />,
  };

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-6 py-12">
      <Link
        href="/centers"
        className="text-gray-700 hover:text-black mb-8 block text-sm flex items-center gap-2"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to Offline Centres
      </Link>

      <div className="grid lg:grid-cols-2 gap-12 items-start">
        <div>
          {isFeatured && (
            <span className="inline-block bg-green-500 text-white text-xs font-medium px-4 py-1.5 rounded-full mb-4">
              Branch Location
            </span>
          )}
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            {name}
          </h1>
          <p className="text-gray-600 text-base leading-relaxed mb-8">
            {description}
          </p>
        </div>

        <div className="relative h-[400px] lg:h-[500px] rounded-3xl overflow-hidden shadow-2xl">
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src =
                "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80";
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
        <div className="bg-orange-50 p-6 rounded-2xl">
          <FaMapMarkerAlt className="text-[#FF6B35] w-8 h-8 mb-4" />
          <h3 className="font-bold text-lg text-gray-900 mb-2">Location</h3>
          <p className="text-gray-700 text-sm">{address}</p>
        </div>

        <div className="bg-orange-50 p-6 rounded-2xl">
          <FaClock className="text-[#FF6B35] w-8 h-8 mb-4" />
          <h3 className="font-bold text-lg text-gray-900 mb-2">
            Opening Hours
          </h3>
          <p className="text-gray-700 text-sm">{openingHours}</p>
        </div>

        <div className="bg-orange-50 p-6 rounded-2xl">
          <FaUsers className="text-[#FF6B35] w-8 h-8 mb-4" />
          <h3 className="font-bold text-lg text-gray-900 mb-2">Capacity</h3>
          <p className="text-gray-700 text-sm">{capacity}</p>
        </div>
      </div>

      {facilities.length > 0 && (
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Facilities & Amenities
          </h2>
          <div className="flex flex-wrap gap-4">
            {facilities.map((f, i) => (
              <span
                key={i}
                className="flex items-center gap-2 px-4 py-2 bg-teal-100 text-teal-800 rounded-full text-sm font-medium"
              >
                {facilityIcons[f] || <FaWifi className="w-4 h-4" />} {f}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
