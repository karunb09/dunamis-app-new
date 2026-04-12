import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { fetchBranchById } from "../../../redux/Branch/branchSlice";
import { resolveImageUrl } from "../../../utils/resolveImageUrl";
import {
  FaWifi, FaParking, FaSnowflake, FaCoffee, FaDumbbell,
  FaBook, FaProjectDiagram, FaMapMarkerAlt, FaEnvelope,
  FaClock, FaUsers, FaPhoneAlt, FaBriefcase, FaBookOpen, FaCity
} from "react-icons/fa";

const CenterDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { selectedBranch, loading, error } = useSelector((state) => state.branch);

  useEffect(() => {
    if (id) {
      dispatch(fetchBranchById(id));
    }
  }, [dispatch, id]);

  if (loading) {
    return <p className="p-6 text-gray-500">Loading branch details...</p>;
  }

  if (error) {
    return (
      <div className="p-6">
        <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline mb-4">
          ← Back
        </button>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  const center = selectedBranch;

  if (!center) {
    return (
      <div className="p-6">
        <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline mb-4">
          ← Back
        </button>
        <p className="text-red-600">Branch data not found.</p>
      </div>
    );
  }

  // Data already populated from backend
  const populatedCourses = center.courses || [];
  const populatedTeachers = center.teachers || [];

  const facilityIcons = {
    WiFi: <FaWifi className="w-5 h-5" />,
    Parking: <FaParking className="w-5 h-5" />,
    "Air Conditioning": <FaSnowflake className="w-5 h-5" />,
    Cafeteria: <FaCoffee className="w-5 h-5" />,
    Gym: <FaDumbbell className="w-5 h-5" />,
    Library: <FaBook className="w-5 h-5" />,
    Projectors: <FaProjectDiagram className="w-5 h-5" />,
  };

  const {
    status,
    branchName,
    branchImage,
    location,
    branchTimings,
    branchCapacity,
    branchManager,
    branchAdminEmail,
    branchAdminContact,
    city,
    zone,
    centreFacilities = "",
  } = center;

  const cityName = city?.cityName || city?.name || "City not assigned";

  const facilities = centreFacilities
    ? centreFacilities.split(",").map((f) => f.trim())
    : [];

  const branchFallbackImage = `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(
    branchName || "Branch"
  )}`;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto bg-white rounded-2xl shadow-md min-h-screen text-sm">
      <button
        onClick={() => navigate(-1)}
        className="text-gray-600 hover:text-gray-900 mb-6 font-medium flex items-center gap-1"
      >
        ← Back to Offline Centres
      </button>
      <div className="mb-6 flex justify-end">
        <button
          onClick={() => navigate(`/admin/centers/edit-branch/${center._id}`)}
          className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Edit Branch
        </button>
      </div>

      <div className="flex flex-col md:flex-row justify-between gap-6 items-start md:items-center">
        <div className="flex flex-col md:flex-row justify-between gap-6 items-start md:items-center">
          <div className="flex-1 md:w-1/2">
            <h1 className="text-2xl font-medium leading-snug mb-3 text-gray-900">
              {branchName}
            </h1>
            <p className="text-gray-700 text-sm leading-relaxed max-w-3xl break-words">
              {branchManager?.name?.firstName} {branchManager?.name?.lastName}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-800">
                <FaCity className="text-gray-500" />
                {cityName}
              </span>
              {zone && (
                <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-800">
                  Zone {zone}
                </span>
              )}
              {status && (
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-medium capitalize text-emerald-800">
                  {status}
                </span>
              )}
            </div>
            <button
              className="mt-4 px-5 py-2 bg-gray-700 text-white rounded-xl text-sm font-medium shadow hover:bg-gray-800 transition"
              onClick={() => toast.success("Viewing all courses")}
            >
              View All Courses
            </button>
          </div>

          <div className="w-full md:w-1/2 relative">
            <img
              src={resolveImageUrl(branchImage, branchFallbackImage)}
              alt={branchName}
              className="rounded-xl w-full h-auto object-cover shadow-md border border-gray-200"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        {[
          {
            icon: <FaMapMarkerAlt className="text-gray-600 w-6 h-6" />,
            title: "Location",
            value: location,
          },
          {
            icon: <FaCity className="text-gray-600 w-6 h-6" />,
            title: "City",
            value: cityName,
          },
          {
            icon: <FaClock className="text-gray-600 w-6 h-6" />,
            title: "Opening Hours",
            value: branchTimings?.length === 2 ? branchTimings.join(" - ") : "N/A",
          },
          {
            icon: <FaUsers className="text-gray-600 w-6 h-6" />,
            title: "Capacity",
            value: branchCapacity,
          },
        ].map(({ icon, title, value }, idx) => (
          <div key={idx} className="p-4 bg-gray-50 rounded-xl shadow-sm hover:shadow transition">
            <h4 className="font-semibold mb-1 flex items-center gap-2 text-gray-700 text-sm">
              {icon} {title}
            </h4>
            <p className="text-gray-600 text-sm">{value || "N/A"}</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 rounded-xl p-6 mt-12 grid grid-cols-1 md:grid-cols-2 gap-4 shadow-inner">
        <div className="flex items-center gap-3">
          <FaPhoneAlt className="text-gray-700 w-5 h-5" />
          <span className="text-black font-medium">{branchAdminContact || "N/A"}</span>
        </div>
        <div className="flex items-center gap-3">
          <FaEnvelope className="text-gray-700 w-5 h-5" />
          <span className="text-black font-medium break-words">{branchAdminEmail || "N/A"}</span>
        </div>
      </div>

      <div className="mt-12">
        <h3 className="text-xl font-medium mb-4 text-gray-900">Facilities & Amenities</h3>
        <div className="flex flex-wrap gap-3">
          {facilities.length > 0 ? (
            facilities.map((f, i) => (
              <span
                key={i}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-black rounded-xl font-normal shadow-sm text-sm"
              >
                {facilityIcons[f]} {f}
              </span>
            ))
          ) : (
            <p className="text-gray-500 text-sm">No facilities listed</p>
          )}
        </div>
      </div>

      {/* Courses Section */}
      <div className="mt-12">
        <h3 className="text-xl font-medium mb-6 text-gray-900">Courses Available</h3>
        {populatedCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {populatedCourses.map((course, idx) => {
              if (!course) return null;

              let priceDisplay = "Contact for pricing";
              let monthlyPrice = null;
              let fullPrice = null;
              let discount = null;

              if (Array.isArray(course.price) && course.price.length > 0) {
                const activePricing = course.price.find((p) => p?.isActive) || course.price[0];
                if (activePricing) {
                  if (activePricing.fullPayment) {
                    fullPrice = activePricing.fullPayment;
                    priceDisplay = `₹${activePricing.fullPayment.toLocaleString()}`;
                  }
                  if (activePricing.monthlyFee) {
                    monthlyPrice = activePricing.monthlyFee;
                    if (!fullPrice) {
                      priceDisplay = `₹${activePricing.monthlyFee.toLocaleString()}/month`;
                    }
                  }
                  if (activePricing.discount > 0) {
                    discount = activePricing.discount;
                  }
                }
              }

              let courseDuration = "";
              if (course.content?.[0]?.modules?.[0]?.duration) {
                courseDuration = course.content[0].modules[0].duration;
              }

              return (
                <div
                  key={course._id || idx}
                  className="border border-gray-200 p-5 rounded-xl bg-white shadow-md hover:shadow-lg transition"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className="font-semibold text-base text-black flex-1">
                      {course.name || "Untitled Course"}
                    </h4>
                    {course.level && (
                      <span className="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded-full font-medium">
                        {course.level}
                      </span>
                    )}
                  </div>

                  <p className="text-gray-600 text-sm mb-2 flex items-center gap-2">
                    <FaBookOpen className="w-4 h-4 text-gray-500" />
                    {courseDuration}
                  </p>

                  <div className="mt-3 mb-3">
                    <p className="font-semibold text-lg text-gray-900">{priceDisplay}</p>
                    <div className="mt-2 space-y-1">
                      {monthlyPrice && fullPrice && (
                        <p className="text-xs text-gray-600">
                          Monthly: ₹{monthlyPrice.toLocaleString()} | Full: ₹{fullPrice.toLocaleString()}
                        </p>
                      )}
                      {discount > 0 && (
                        <p className="text-xs text-green-600 font-medium">
                          Save {discount.toLocaleString()}% with full payment
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    className="mt-4 px-5 py-2 w-full bg-gray-700 text-white rounded-xl font-medium shadow hover:bg-gray-800 transition"
                    onClick={() => navigate(`/course/${course._id}`)}
                  >
                    View Details
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500">No courses available for this branch.</p>
        )}
      </div>

      {/* Teachers Section */}
      <div className="mt-16">
        <h3 className="text-xl font-medium mb-8 text-gray-900">Our Teachers</h3>
        {populatedTeachers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {populatedTeachers.map((teacher, idx) => {
              if (!teacher) return null;

              const teacherDetails = teacher.teacherDetail || {};
              const user = teacher.userId || {};

              const firstName = teacherDetails.name?.firstName || user.name?.firstName || "";
              const lastName = teacherDetails.name?.lastName || user.name?.lastName || "";
              const teacherName = `${firstName} ${lastName}`.trim() || "Unknown Teacher";

              const profilePicture = resolveImageUrl(
                teacherDetails.profilePicture || user.image,
                `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
                  teacherName
                )}`
              );
              const experience = teacherDetails.yearOfExperience ? `${teacherDetails.yearOfExperience} years` : null;
              const areaOfExpertise = teacherDetails.areaOfExpertise || "No specialization listed";

              return (
                <div
                  key={teacher._id || idx}
                  className="border border-gray-200 rounded-xl p-5 bg-white shadow-md hover:shadow-lg transition"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <img
                      src={profilePicture}
                      alt={teacherName}
                      className="w-14 h-14 rounded-full object-cover border-2 border-gray-200"
                      onError={(e) => {
                        e.target.src = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
                          teacherName
                        )}`;
                      }}
                    />
                    <div>
                      <h4 className="font-semibold text-sm text-black">{teacherName}</h4>
                      {experience && (
                        <div className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                          <FaBriefcase className="w-3.5 h-3.5" />
                          {experience}
                        </div>
                      )}
                    </div>
                  </div>
                  {teacher.averageRating && (
                    <p className="text-xs text-gray-500 mb-2">
                      ⭐ <span className="font-medium">{teacher.averageRating}</span>
                    </p>
                  )}
                  <p className="text-gray-700 text-xs leading-relaxed">
                    <span className="font-medium">Expertise:</span> {areaOfExpertise}
                  </p>
                  {teacherDetails.highestQualification && (
                    <p className="text-gray-700 text-xs leading-relaxed mt-1">
                      <span className="font-medium">Qualification:</span> {teacherDetails.highestQualification}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500">No teachers assigned to this branch yet.</p>
        )}
      </div>
    </div>
  );
};

export default CenterDetailsPage;
