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

export default function CoursesTab({ instructor, categoryConfig }) {
    const instructorName = `${instructor.teacherDetails.name.firstName} ${instructor.teacherDetails.name.lastName}`;

    return (
        <div className="mt-4 bg-white rounded-xl shadow-sm p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
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
                        className="flex flex-col sm:flex-row w-full bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200"
                    >
                        <div className="shrink-0">
                            <img
                                src={resolveImageUrl(course.image, course.category?.icon || "")}
                                alt={course.name}
                                className="h-40 w-full object-cover sm:h-full sm:w-48"
                            />
                        </div>

                        <div className="p-4 flex flex-col justify-between grow min-w-0">
                            <div>
                                <div className="flex flex-wrap gap-2 mb-2 items-center">
                                    <span
                                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full"
                                        style={{ backgroundColor: bgColor, color: categoryColor }}
                                    >
                                        {course.category?.name || "General"}
                                    </span>
                                    <span className="text-xs font-medium text-gray-700 bg-gray-200 px-2 py-1 rounded-full">
                                        {level}
                                    </span>
                                </div>

                                <h3 className="text-md font-semibold text-gray-900 break-words">{course.name}</h3>
                                <p className="text-sm text-gray-500 mb-3">by {instructorName}</p>
                                <p className="text-sm text-gray-600 line-clamp-3">{description}</p>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
