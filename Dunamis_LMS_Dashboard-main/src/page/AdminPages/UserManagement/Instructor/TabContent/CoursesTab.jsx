import { resolveImageUrl } from "../../../../../utils/resolveImageUrl";

// Helper: convert hex color to rgba with alpha
function hexToRgba(hex, alpha = 1) {
    if (!hex) return `rgba(0,0,0,${alpha})`;
    let c = hex.replace("#", "");
    if (c.length === 3) {
        c = c.split("").map((x) => x + x).join("");
    }
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function CoursesTab({ instructor }) {
    const instructorName = `${instructor.teacherDetails.name.firstName} ${instructor.teacherDetails.name.lastName}`;

    return (
        <div className="mt-4 bg-white rounded-xl shadow-sm p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {instructor.courses?.map((course) => {
                const mainContent = course.content?.[0] || {};
                const description = mainContent.courseDescription || "";
                const level = course.level || mainContent.modules?.[0]?.duration || "Beginner";

                // Get category color
                const categoryColor = course.category?.color || "#3b82f6"; // fallback blue
                const bgColor = hexToRgba(categoryColor, 0.2); // 20% opacity

                return (
                    <div
                        key={course._id}
                        className="flex w-full bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200"
                    >
                        <img
                            src={resolveImageUrl(course.image, course.category?.icon || "")}
                            alt={course.name}
                            className="h-full w-24 shrink-0 object-cover sm:w-28"
                        />

                        <div className="p-3 flex flex-col justify-between grow min-w-0">
                            <div>
                                <div className="flex flex-wrap gap-1.5 mb-1.5 items-center">
                                    <span
                                        className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full"
                                        style={{ backgroundColor: bgColor, color: categoryColor }}
                                    >
                                        {course.category?.name || "General"}
                                    </span>
                                    <span className="text-[11px] font-medium text-gray-700 bg-gray-200 px-2 py-0.5 rounded-full">
                                        {level}
                                    </span>
                                    {course.mode && (
                                        <span
                                            className={`px-2 py-0.5 text-[11px] font-medium capitalize rounded-full ${
                                                course.mode === "offline"
                                                    ? "bg-sky-50 text-sky-600"
                                                    : "bg-emerald-50 text-emerald-600"
                                            }`}
                                        >
                                            {course.mode}
                                        </span>
                                    )}
                                </div>

                                <h3 className="text-sm font-semibold text-gray-900 break-words">{course.name}</h3>
                                <p className="text-xs text-gray-500 mb-1.5">by {instructorName}</p>
                                <p className="text-xs text-gray-600 line-clamp-2">{description}</p>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
