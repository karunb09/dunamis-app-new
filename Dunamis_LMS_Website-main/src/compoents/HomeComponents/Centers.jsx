"use client";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import { fetchOfflineCenters } from "@/store/centerSlice";

// Get image base URL from environment variable
const IMAGE = process.env.NEXT_PUBLIC_IMAGE_URL;

export default function Centers() {
  const router = useRouter();
  const dispatch = useDispatch();

  // Redux state - Add detailed debugging
  const offlineCenterState = useSelector((state) => {
    console.log("Full Redux State:", state);
    console.log("offlineCenters slice:", state.offlineCenters);
    return state.offlineCenters;
  });

  // Handle both 'centers' and 'branches' keys from API
  const centersData = offlineCenterState?.centers || offlineCenterState?.branches || [];
  const loading = offlineCenterState?.loading || false;
  const error = offlineCenterState?.error || null;

  console.log("offlineCenterState:", offlineCenterState);
  console.log("Centers Data:", centersData);
  console.log("Centers type:", typeof centersData);
  console.log("Centers isArray:", Array.isArray(centersData));
  console.log("Centers length:", centersData?.length);
  console.log("Loading:", loading);
  console.log("Error:", error);

  useEffect(() => {
    dispatch(fetchOfflineCenters());
  }, [dispatch]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.3 },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    },
  };

  const allCenters = Array.isArray(centersData) ? centersData.slice(0, 3) : [];
  console.log("All centers displayed on UI:", allCenters);
  console.log("First center image:", allCenters[0]?.branchImage);

  // Helper function to process image URLs
  const getImageUrl = (branchImage) => {
    // Fallback image if no branchImage provided
    if (!branchImage) {
      return "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80";
    }

    // If already a complete URL, return as-is
    if (branchImage.startsWith('http://') || branchImage.startsWith('https://')) {
      return branchImage;
    }

    // If it's a relative path, prepend base URL
    const cleanPath = branchImage.startsWith('/') ? branchImage : `/${branchImage}`;
    const fullUrl = `${IMAGE}${cleanPath}`;

    console.log('Image URL constructed:', fullUrl);
    return fullUrl;
  };

  if (loading) {
    return (
      <section className="py-20 px-6 text-center">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B35]"></div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-20 px-6 text-center">
        <p className="text-red-500 font-medium">Error: {error}</p>
      </section>
    );
  }

  return (
    <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 text-center bg-gray-50">
      {/* Section Title */}
      <motion.p
        className="text-[#FF6B35] font-medium mb-2 text-sm sm:text-base"
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        Experience Learning in Person
      </motion.p>

      <motion.h2
        className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#2D2D2D] mb-3 sm:mb-4 px-2"
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        Find Your Nearest Centre
      </motion.h2>

      <motion.p
        className="text-[#2D2D2D] text-sm sm:text-base mb-8 sm:mb-10 max-w-3xl mx-auto px-2"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        Visit our physical branches for personalized instruction, hands-on learning, and
        a supportive community environment. Each center is equipped with modern
        facilities to make your learning experience exceptional.
      </motion.p>

      {/* Centers Grid */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 max-w-7xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.2 }}
      >
        {allCenters.length > 0 ? (
          allCenters.map((center, index) => (
            <motion.div
              key={center._id || index}
              className="bg-white rounded-2xl shadow-md overflow-hidden text-left hover:shadow-lg transition-transform duration-300 hover:-translate-y-1 cursor-pointer"
              variants={cardVariants}
              onClick={() => router.push(`/centers/${center._id}`)}
            >
              {/* Center Image */}
              <motion.img
                src={getImageUrl(center.branchImage)}
                alt={center.branchName || "Branch"}
                className="w-full h-40 sm:h-48 object-cover"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.4 }}
              />

              {/* Card Details */}
              <div className="p-4 sm:p-5">
                <div className="flex item-center justify-between">
                  <h3 className="font-semibold text-base sm:text-lg text-[#2D2D2D] mb-2">
                    {center.branchName || "Unnamed Center"}
                  </h3>
                  {/* Status Badge */}
                  {center.status && (
                    <div className="mb-3">
                      <span
                        className={`inline-block text-xs px-3 py-1 rounded-full font-medium ${center.status.toLowerCase() === "active"
                            ? "bg-green-100 text-green-700"
                            : center.status.toLowerCase() === "inactive"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                      >
                        {center.status}
                      </span>
                    </div>
                  )}
                </div>

                {/* Location */}
                <p className="text-gray-600 text-xs sm:text-sm flex items-start gap-1 mb-3">
                  <MapPin className="w-4 h-4 text-[#FF6B35] flex-shrink-0 mt-0.5" />
                  <span title={center.location} className="line-clamp-2">
                    {center.location || "Location not available"}
                  </span>
                </p>

                {/* City */}
                {center.city?.cityName && (
                  <p className="text-gray-500 text-xs mb-2">
                    <span className="font-semibold">City:</span> {center.city.cityName}
                  </p>
                )}

                {/* Facilities */}
                {center.centreFacilities && center.centreFacilities.trim() !== "" ? (
                  <div className="mb-3">
                    <p className="text-gray-700 text-xs font-semibold mb-1.5">Facilities:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {center.centreFacilities
                        .split(",")
                        .filter((facility) => facility.trim() !== "")
                        .slice(0, 3)
                        .map((facility, i) => (
                          <span
                            key={i}
                            className="text-xs px-2.5 py-1 bg-orange-50 text-[#FF6B35] border border-[#FF6B35]/20 rounded-full font-medium"
                          >
                            {facility.trim()}
                          </span>
                        ))}
                      {center.centreFacilities.split(",").filter((f) => f.trim()).length > 3 && (
                        <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full font-medium">
                          +{center.centreFacilities.split(",").filter((f) => f.trim()).length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400 text-xs italic mb-3">
                    No facilities listed
                  </p>
                )}

                {/* Timings */}
                {center.branchTimings?.length > 0 && (
                  <p className="text-gray-600 text-xs mb-2 flex items-start gap-1">
                    <span className="font-semibold text-gray-700">Timings:</span>
                    <span className="flex-1">{center.branchTimings.join(" - ")}</span>
                  </p>
                )}

                {/* Open Days */}
                {center.branchOpenDays?.length > 0 && (
                  <p className="text-gray-600 text-xs mb-2 flex items-start gap-1">
                    <span className="font-semibold text-gray-700">Open Days:</span>
                    <span className="flex-1">{center.branchOpenDays.join(", ")}</span>
                  </p>
                )}

                {/* Capacity */}
                {center.branchCapacity && (
                  <p className="text-gray-600 text-xs mb-2">
                    <span className="font-semibold text-gray-700">Capacity:</span> {center.branchCapacity} students
                  </p>
                )}

                {/* Admin Contact Info */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  {center.branchAdminEmail && (
                    <p className="text-gray-600 text-xs mb-1.5 truncate">
                      <span className="font-semibold text-gray-700">Email:</span>{" "}
                      <a
                        href={`mailto:${center.branchAdminEmail}`}
                        className="text-[#FF6B35] hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {center.branchAdminEmail}
                      </a>
                    </p>
                  )}
                  {center.branchAdminContact && (
                    <p className="text-gray-600 text-xs">
                      <span className="font-semibold text-gray-700">Contact:</span>{" "}
                      <a
                        href={`tel:${center.branchAdminContact}`}
                        className="text-[#FF6B35] hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {center.branchAdminContact}
                      </a>
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-1 sm:col-span-2 lg:col-span-3">
            <p className="text-gray-500">No centers available right now.</p>
          </div>
        )}
      </motion.div>

      {/* View All Button */}
      <motion.button
        className="cursor-pointer mt-8 sm:mt-12 px-5 sm:px-6 py-2.5 sm:py-3 border border-[#FF6B35] text-[#FF6B35] rounded-full hover:bg-[#FF6B35] hover:text-white transition text-xs sm:text-sm font-medium"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => router.push("/centers")}
      >
        View All Centres
      </motion.button>
    </section>
  );
}