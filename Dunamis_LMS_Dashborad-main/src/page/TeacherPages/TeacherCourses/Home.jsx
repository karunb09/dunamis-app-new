import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getStoredUser } from "../../../utils/authSession";
import { getAllBookings } from "../../../redux/DemoBooking/DemoBookingSlice";
import DemoBookingsPanel from "./DemoBookingsPanel";
import {
  getTeacherRoleId,
  getUserDisplayName,
} from "../../../utils/roleIdentity";

const liveAreas = [
  {
    title: "Courses",
    description: "View the courses currently assigned to your teacher profile.",
    to: "/teacher/courses",
  },
  {
    title: "Students",
    description: "Open your live student list and student detail records.",
    to: "/teacher/students",
  },
  {
    title: "Assignments",
    description: "Create, review, and remind students about live assignments.",
    to: "/teacher/assignments",
  },
  {
    title: "Attendance",
    description: "Review submitted attendance and homework history.",
    to: "/teacher/attendance",
  },
  {
    title: "Assessments",
    description: "Manage pending and completed student assessments.",
    to: "/teacher/assessments",
  },
  {
    title: "Schedule",
    description: "Maintain your live availability and weekly slots.",
    to: "/teacher/schedule",
  },
];

const Dashboard = () => {
  const dispatch = useDispatch();
  const authUser = useSelector((state) => state.auth?.user);
  const { bookings, loading: demoLoading, error: demoError } = useSelector(
    (state) => state.demoBookings || {}
  );
  const storedUser = getStoredUser() || {};
  const resolvedUser = authUser || storedUser || {};
  const teacherId = getTeacherRoleId(resolvedUser);
  const teacherName = getUserDisplayName(resolvedUser, "Teacher");

  useEffect(() => {
    dispatch(getAllBookings(teacherId ? { teacherId } : {}));
  }, [dispatch, teacherId]);

  const handleRefreshDemoBookings = () => {
    dispatch(getAllBookings(teacherId ? { teacherId } : {}));
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">
          Welcome back, {teacherName}
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-500">
          Demo bookings below are live. Static class lists, invented monthly
          summaries, and placeholder assignment cards have been removed.
        </p>
      </div>

      <DemoBookingsPanel
        bookings={bookings}
        teacherId={teacherId}
        loading={demoLoading}
        error={demoError}
        onRefresh={handleRefreshDemoBookings}
      />

      <section className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-white p-5">
        <h2 className="text-base font-semibold text-gray-900">
          Live Summary Widgets Pending
        </h2>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          Upcoming classes, attendance capture, monthly teaching hours, and
          pending work should be rendered here only after they are backed by
          real schedule and classroom APIs.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          Continue With Live Areas
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {liveAreas.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
            >
              <h3 className="font-semibold text-gray-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                {item.description}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
