
import { ClipboardCheckIcon, MapPin } from "lucide-react";
import { IoMdStar } from "react-icons/io";

export default function CourseCard({
  image,
  fallbackImage,
  icon,
  tags,
  title,
  mentor,
  duration,
  mode,
  rating,
  type,
  price,
  description,
  branchName,
  onViewDetails,
  onBookDemo,
}) {
  const summary = description || `Learn from ${mentor} • ${duration} • Interactive sessions with practical exercises and personalized feedback`;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-gray-300 bg-white shadow-md">
      {/* Course Image */}
      <img
        src={image}
        alt={title}
        className="w-full h-40 object-cover"
        loading="lazy"
        decoding="async"
        onError={(e) => {
          if (fallbackImage) {
            e.currentTarget.src = fallbackImage;
          }
        }}
      />

      <div className="flex flex-1 flex-col p-4">
        {/* Tags & Icon */}
        <div className="mb-3 flex min-h-[32px] items-start gap-3">
          <div className="text-xl leading-8">{icon}</div>
          <div className="flex flex-wrap gap-2 overflow-hidden">
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

       
        <div className="flex min-h-[48px] items-start justify-between gap-3">
          <h3 className="line-clamp-2 font-bold text-md leading-6">{title}</h3>
          <span
            className={`shrink-0 text-sm font-medium ${
              mode === "online" ? "text-green-600" : "text-gray-500"
            }`}
          >
            ● {mode}
          </span>
        </div>

        
        {branchName && (
          <p className="mt-2 flex min-h-[20px] items-center gap-1 text-sm text-gray-600">
            <MapPin className="h-4 w-4 shrink-0 text-[#FF6B35]" />
            <span className="line-clamp-1 font-medium">{branchName}</span>
          </p>
        )}
        <p className="mt-3 min-h-[44px] line-clamp-2 text-sm leading-5 text-gray-600">
          {summary}
        </p>
        <div className="mt-3 flex min-h-[32px] items-center justify-between gap-3">
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
        <div className="mt-3 flex min-h-[28px] items-center justify-between">
          <span className="font-semibold text-gray-900">
            ₹
            {price?.monthlyFee 
              ? `${price.monthlyFee}/month` 
              : price?.fullPayment 
              ? price.fullPayment
              : "N/A"}
          </span>
        </div>

        <div className={`mt-auto grid gap-3 pt-3 ${onBookDemo ? "grid-cols-2" : "grid-cols-1"}`}>
          <button
            onClick={onViewDetails}
            className="cursor-pointer w-full bg-[#FF6B35] hover:bg-[#fd5a1f] text-white font-medium py-2 px-4 rounded-2xl"
          >
            View Details
          </button>
          {onBookDemo ? (
            <button
              onClick={onBookDemo}
              className="cursor-pointer w-full border border-[#FF6B35] bg-white text-[#FF6B35] font-medium py-2 px-4 rounded-2xl hover:bg-[#fff3ed]"
            >
              Book Demo
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
