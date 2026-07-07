import {
    FiDownload,
    FiRefreshCw,
    FiClock,
    FiMonitor,
    FiUsers,
    FiUser,
} from "react-icons/fi";

export default function RemunerationTab({ remunerations }) {
    // Use the first remuneration or fallback to empty object
    const remuneration = remunerations?.[0] ?? {};

    const formattedMonth = remuneration.month
        ? new Date(`${remuneration.month}-01`).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
        })
        : "No Month Available";

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                <h2 className="text-xl font-semibold">{formattedMonth}</h2>
                <div className="flex flex-wrap gap-3">
                    <button className="px-4 py-2 rounded-full border flex items-center gap-2 text-sm hover:bg-gray-50">
                        <FiDownload /> Download Pay Slips
                    </button>
                    <button className="px-4 py-2 rounded-full border flex items-center gap-2 text-sm hover:bg-gray-50">
                        <FiRefreshCw /> Refresh
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                {/* Total Hours */}
                <Card title="Total Hours" icon={<FiClock />} value={remuneration.totalHours ?? 0}>
                    {remuneration.groupHours ?? 0}h group classes | {remuneration.individualHours ?? 0}h individual classes
                </Card>

                {/* Missed Classes */}
                <Card title="Classes Missed" icon={<FiMonitor />} value={remuneration.missedClasses ?? 0}>
                    {remuneration.missedClasses ?? 0} group session(s) | 0 individual sessions
                </Card>

                {/* Group Students */}
                <Card title="Group Students" icon={<FiUsers />} value={remuneration.groupStudents ?? 0}>
                    0 class rescheduled
                </Card>

                {/* Individual Students */}
                <Card title="Individual Students" icon={<FiUser />} value={remuneration.individualStudents ?? 0}>
                    0 classes rescheduled
                </Card>

                {/* Demo Students */}
                <Card title="Demo Students" icon={<FiMonitor />} value={remuneration.demoStudents ?? 0}>
                    0 new students
                </Card>
            </div>
        </div>
    );
}

const Card = ({ title, icon, value, children }) => (
    <div className="bg-white border p-5 rounded-xl flex flex-col gap-3">
        <div className="flex items-center justify-between">
            <h3 className="text-gray-700 font-medium">{title}</h3>
            {icon}
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-gray-500">{children}</p>
    </div>
);
