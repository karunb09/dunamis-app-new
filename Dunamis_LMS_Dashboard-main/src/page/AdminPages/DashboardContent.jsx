import { FiMusic, FiActivity, FiBookOpen } from "react-icons/fi";

export default function DashboardContent() {
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
            src="/images/monthly-revenue.png"
            alt="Monthly Revenue"
            className="h-full object-contain"
          />
        </div>
        <div className="bg-white rounded-2xl shadow p-4 h-72 flex items-center justify-center">
          <img
            src="/images/student-enrollment.png"
            alt="Student Enrollment"
            className="h-full object-contain"
          />
        </div>
      </div>

      {/* Student Distribution */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <SmallCard icon={<FiMusic size={20} />} title="Music Students" value="647" subtitle="53.9% of total" />
        <SmallCard icon={<FiActivity size={20} />} title="Dance Students" value="276" subtitle="23% of total" />
        <SmallCard icon={<FiBookOpen size={20} />} title="Language Students" value="212" subtitle="17% from last month" />
      </div>

      {/* Tasks & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-2xl shadow">
          <h3 className="text-lg font-semibold mb-3">Upcoming Tasks</h3>
          <div className="p-3 border rounded-lg bg-yellow-50">
            <p className="font-medium">Review music instructor application</p>
            <p className="text-sm text-gray-600">
              8 new Carnatic music teacher applications pending
            </p>
            <span className="text-xs bg-yellow-200 px-2 py-1 rounded mt-2 inline-block">
              Due Today
            </span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow">
          <h3 className="text-lg font-semibold mb-3">Recent Activity</h3>
          <ul className="space-y-3">
            <li className="text-sm">
              <span className="font-medium">Aaril Sharma</span> – New enrollment in Carnatic Vocal Beginner.{" "}
              <span className="text-gray-500">41m ago</span>
            </li>
            <li className="text-sm">
              <span className="font-medium">Jean-Pierre Dubois</span> – Completed French Intermediate certification.{" "}
              <span className="text-gray-500">2h ago</span>
            </li>
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
