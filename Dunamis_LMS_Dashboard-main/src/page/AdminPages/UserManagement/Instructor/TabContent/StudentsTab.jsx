import { FiUsers, FiBookOpen, FiCalendar, FiClock } from "react-icons/fi";

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

const DEFAULT_AVATAR = "https://tse4.mm.bing.net/th/id/OIP.Ae18imWmNTdnadgBRha8ZQHaHa?cb=12&rs=1&pid=ImgDetMain&o=7&rm=3";

export default function StudentsTab({ instructor }) {
    const students = instructor?.students || [];
    const attendanceHistory = instructor?.attendanceHistory || [];
    const mode = instructor?.teacherDetails?.mode;

    const transformedStudents = students.map((s) => {
        const course = s.courses?.[0];
        const category = course?.category;
        const firstContent = course?.content?.[0];

        const attendance = attendanceHistory.find(
            (a) =>
                a.user === `${s.name.firstName} ${s.name.lastName}` &&
                a.courseCategory === category?.name
        );

        return {
            id: s._id || s.id,
            name: `${s.name.firstName} ${s.name.lastName}`,
            avatarInitials: `${s.name.firstName[0] || ""}${s.name.lastName[0] || ""}`.toUpperCase(),
            courseName: course?.name || "—",
            courseCategory: category?.name || "—",
            courseIcon: category?.icon || "—",
            courseColor: category?.color || "—",
            type: course?.sessionType || mode || "—",
            description: firstContent?.courseDescription || "No description available.",
            studentCount: instructor?.studentCount || "—",
            sessionCount: attendance?.attendance || "—",
            schedule: attendance?.slot || "—",
            modulesCount: firstContent?.modules?.length || 0,
            modulesDuration: firstContent?.modules
                ? firstContent.modules.map((m) => m.duration).join(", ")
                : "—",
        };
    });

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {transformedStudents.length > 0 ? (
                transformedStudents.map((s) => (
                    <div
                        key={s.id}
                        className="bg-white rounded-xl shadow-sm p-5 border hover:shadow-md transition"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-semibold text-gray-700">
                                {s.avatarInitials}
                            </div>

                            <h3 className="text-lg font-semibold">{s.name}</h3>
                        </div>

                        <div className="text-sm flex items-center gap-1 mb-2">
                            <span
                                className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full"
                                style={{
                                    backgroundColor: hexToRgba(s.courseColor, 0.2),
                                    color: s.courseColor || "#000",
                                }}
                            >
                                {s.courseIcon} {s.courseCategory}
                            </span>
                        </div>

                        <h4 className="text-md font-medium text-gray-900 mb-1">{s.courseName}</h4>

                        <div className="text-xs text-gray-600 mb-2 flex items-center gap-1">
                            <FiUsers className="text-gray-400" /> {s.type} Mode
                        </div>

                        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{s.description}</p>

                        <div className="flex justify-between items-center mt-2 text-gray-600 text-sm">
                            <div className="flex items-center gap-1">
                                <FiCalendar className="text-gray-500" /> {s.modulesDuration}
                            </div>
                            <div className="flex items-center gap-1">
                                <FiBookOpen /> {s.modulesCount} Modules
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                <div className="col-span-full bg-white rounded-xl shadow-sm p-10 text-center border">
                    <p className="text-gray-500">🚫 No students enrolled yet.</p>
                </div>
            )}
        </div>
    );
}
