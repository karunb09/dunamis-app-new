const IMAGE = import.meta.env.VITE_IMAGE;

// Helper: convert hex color to rgba with alpha
function hexToRgba(hex, alpha = 1) {
    if (!hex) return `rgba(59, 130, 246, ${alpha})`; // default blue
    let c = hex.replace("#", "");
    if (c.length === 3) {
        c = c.split("").map((x) => x + x).join("");
    }
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const CoursesTab = ({ student }) => {
    const enrolledCourses = student?.enrolledCourses || [];

    if (enrolledCourses.length === 0) {
        return <p className="text-gray-500">No courses enrolled.</p>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {enrolledCourses.map((item) => {
                const course = item.courseId;

                if (!course) {
                    console.warn("Skipping enrollment with null courseId:", item);
                    return null;
                }

                const progress = item.progress || 0;
                const status = item.status || "in-progress";

                // Get category details (can be null)
                const categoryName = course.category?.name || "N/A";
                const categoryIcon = course.category?.icon || "";
                const categoryColor = course.category?.color || "#3b82f6";
                const categoryBgColor = hexToRgba(categoryColor, 0.2);

                // Format dates
                const startDate = course.startDate
                    ? new Date(course.startDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    })
                    : "-";
                const endDate = course.endDate
                    ? new Date(course.endDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    })
                    : "-";

                return (
                    <div
                        key={item._id}
                        className="flex bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200"
                    >
                        <img
                            src={
                                course.image
                                    ? course.image.startsWith("http")
                                        ? course.image
                                        : `${IMAGE}${course.image}`
                                    : "/placeholder.png"
                            }
                            alt={course.name}
                            className="h-full w-44 object-cover"
                        />
                        <div className="p-4 flex flex-col justify-between flex-1">
                            <div>
                                <div className="flex gap-2 mb-2 flex-wrap">
                                    {/* Category badge with dynamic color */}
                                    <span
                                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full"
                                        style={{
                                            backgroundColor: categoryBgColor,
                                            color: categoryColor
                                        }}
                                    >
                                        <span>{categoryIcon}</span>
                                        <span>{categoryName}</span>
                                    </span>

                                    {/* Level badge */}
                                    <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full capitalize">
                                        {course.level}
                                    </span>

                                    {/* Status badge */}
                                    <span
                                        className={`text-xs px-2 py-1 rounded-full capitalize ${status === 'completed'
                                                ? 'bg-green-100 text-green-700'
                                                : status === 'in-progress'
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : 'bg-gray-100 text-gray-700'
                                            }`}
                                    >
                                        {status.replace('-', ' ')}
                                    </span>
                                </div>

                                {/* Course name */}
                                <h3 className="text-md font-semibold text-gray-900">
                                    {course.name}
                                </h3>

                                {/* Course code */}
                                <p className="text-sm text-gray-500">
                                    Code: {course.code}
                                </p>

                                {/* Date range */}
                                <p className="text-xs text-gray-400 mt-1">
                                    {startDate} - {endDate}
                                </p>

                                {/* Mode and Type */}
                                <p className="text-xs text-gray-500 mt-1">
                                    Mode: <span className="capitalize">{course.mode}</span> • Type: <span className="capitalize">{course.courseType}</span>
                                </p>
                            </div>

                            {/* Progress bar */}
                            <div className="mt-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className={`h-2 rounded-full transition-all ${progress === 100 ? 'bg-green-600' : 'bg-blue-600'
                                                }`}
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                                        {progress}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default CoursesTab;
