import { Music, Activity, BookOpen } from "react-feather";
import { Link } from "react-router-dom";


const recentActivities = [
    {
        id: 1,
        name: "Aarti Sharma",
        avatar: "https://randomuser.me/api/portraits/women/65.jpg",
        activity: "New enrollment in Carnatic Vocal Beginner.",
        time: "41m ago",
    },
    {
        id: 2,
        name: "Jean-Pierre Dubois",
        avatar: "https://randomuser.me/api/portraits/men/32.jpg",
        activity: "Completed French Intermediate certification.",
        time: "2h ago",
    },
    {
        id: 3,
        name: "Raj Patel",
        avatar: "https://randomuser.me/api/portraits/men/45.jpg",
        activity: "Updated Guitar lessons material.",
        time: "2h ago",
    },
    {
        id: 4,
        name: "Kirthi Rajesh",
        avatar: "https://randomuser.me/api/portraits/women/44.jpg",
        activity: "Instructor Onboarding complete.",
        time: "2h ago",
    },
];
export default function AdminHomePage() {
    return (
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto w-full">
            {/* Heading */}
            <h2 className="text-lg md:text-2xl font-semibold mb-6">
                Welcome back, Admin!
            </h2>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard title="Total Students" value="1,752" subtitle="+15% from last month" />
                <StatCard title="Active Courses" value="38" subtitle="+3 from last month" />
                <StatCard title="Instructors" value="62" subtitle="+4 from last month" />
                <StatCard title="Revenue" value="₹12,94,730" subtitle="+12% from last month" />
            </div>

            {/* Charts Section (using Images) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white rounded-2xl shadow p-4 h-72 flex items-center justify-center">
                    <img
                        src="/Line Chart.png"
                        alt="Monthly Revenue"
                        className="h-full object-contain"
                    />
                </div>
                <div className="bg-white rounded-2xl shadow p-4 h-72 flex items-center justify-center">
                    <img
                        src="/BarChart.png"
                        alt="Student Enrollment"
                        className="h-full object-contain"
                    />
                </div>
            </div>

            {/* Student Distribution */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                <SmallCard icon={<Music size={20} />} title="Music Students" value="647" subtitle="53.9% of total" />
                <SmallCard icon={<Activity size={20} />} title="Dance Students" value="276" subtitle="23% of total" />
                <SmallCard icon={<BookOpen size={20} />} title="Language Students" value="212" subtitle="17% from last month" />
            </div>

            {/* Tasks & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-2xl shadow">
                    <h3 className="text-lg font-semibold mb-3">Upcoming Tasks</h3>
                    <Link
                        to="/admin/instructor-management/"
                        onClick={() => {
                            localStorage.setItem('instructorManagementActiveTab', 'Applications');
                        }}
                    >
                        <div className="p-3 border rounded-lg bg-yellow-50 hover:bg-yellow-100 cursor-pointer transition">
                            <p className="font-medium">Review music instructor application</p>
                            <p className="text-sm text-gray-600">
                                8 new Carnatic music teacher applications pending
                            </p>
                            <span className="text-xs bg-yellow-200 px-2 py-1 rounded mt-2 inline-block">
                                Due Today
                            </span>
                        </div>
                    </Link>
                </div>
                <div>
                    <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                    <ul className="space-y-6">
                        {recentActivities.map(({ id, name, avatar, activity, time }) => (
                            <li key={id} className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <img
                                        src={avatar}
                                        alt={name}
                                        className="w-10 h-10 rounded-full object-cover"
                                    />
                                    <div>
                                        <p className="font-semibold text-gray-900">{name}</p>
                                        <p className="text-sm text-gray-500">{activity}</p>
                                    </div>
                                </div>
                                <span className="text-xs text-gray-400 whitespace-nowrap">{time}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </main>
    );
}

function StatCard({ title, value, subtitle }) {
    return (
        <div className="bg-white p-4 rounded-2xl shadow">
            <h4 className="text-gray-500 text-sm">{title}</h4>
            <p className="text-xl md:text-2xl font-semibold">{value}</p>
            <p className="text-xs text-green-600 mt-1">{subtitle}</p>
        </div>
    );
}

function SmallCard({ icon, title, value, subtitle }) {
    return (
        <div className="bg-white p-4 rounded-2xl shadow flex items-center space-x-4">
            <div className="p-3 bg-gray-100 rounded-xl">{icon}</div>
            <div>
                <h4 className="font-semibold">{title}</h4>
                <p className="text-lg md:text-xl font-bold">{value}</p>
                <p className="text-xs text-gray-500">{subtitle}</p>
            </div>
        </div>
    );
}