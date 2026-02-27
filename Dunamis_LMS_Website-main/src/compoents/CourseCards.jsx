
import { ClipboardCheckIcon, MapPin } from "lucide-react";
import { IoMdStar } from "react-icons/io";

export default function CourseCard({
  image,
  icon,
  tags,
  title,
  mentor,
  duration,
  mode,
  rating,
  type,
  price,
  branchName, 
  onViewDetails,
}) {
  return (
    <div className="bg-white border border-gray-300 rounded-xl shadow-md overflow-hidden max-w-sm">
      {/* Course Image */}
      <img src={image} alt={title} className="w-full h-40 object-cover" />

      <div className="p-4 space-y-3">
        {/* Tags & Icon */}
        <div className="flex items-center gap-3 mb-2">
          <div className="text-xl">{icon}</div>
          <div className="flex flex-wrap gap-2">
            {Array.isArray(tags) &&
              tags.map((tag, index) => (
                <span
                  key={index}
                  className={`text-xs px-2 py-1 rounded-full text-black`}
                  style={{
                    backgroundColor: tag.color
                      ? `${tag.color}33`
                      : "rgba(224, 242, 254, 0.2)",
                    color: tag.textColor || "#0F172A",
                  }}
                >
                  {tag.name || tag}
                </span>
              ))}
          </div>
        </div>

       
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-md">{title}</h3>
          <span
            className={`text-sm font-medium ${
              mode === "online" ? "text-green-600" : "text-gray-500"
            }`}
          >
            ● {mode}
          </span>
        </div>

        
        {branchName && (
          <p className="text-sm text-gray-600 flex items-center gap-1">
            <MapPin className="w-4 h-4 text-[#FF6B35]" />
            <span className="font-medium">{branchName}</span>
          </p>
        )}
        <p className="text-sm text-gray-600">
          Learn from {mentor} • {duration} • Interactive sessions with practical
          exercises and personalized feedback
        </p>
        <div className="flex justify-between items-center mt-2">
          {/* Certification Type */}
          <p className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full w-fit">
            <ClipboardCheckIcon className="w-4 h-4 text-green-600" />
            {type}
          </p>

          <div className="flex items-center text-sm gap-1 text-gray-700">
            <IoMdStar className="text-amber-500" />
            <span>{rating}</span>
          </div>
        </div>

        {/* Price */}
        <div className="flex justify-between items-center mt-2">
          <span className="font-semibold text-gray-900">
            ₹
            {price?.monthlyFee 
              ? `${price.monthlyFee}/month` 
              : price?.fullPayment 
              ? price.fullPayment
              : "N/A"}
          </span>
        </div>

        {/* View Details Button */}
        <button
          onClick={onViewDetails}
          className="cursor-pointer w-full mt-2 bg-[#FF6B35] hover:bg-[#fd5a1f] text-white font-medium py-2 px-4 rounded-2xl"
        >
          View Details
        </button>
      </div>
    </div>
  );
}