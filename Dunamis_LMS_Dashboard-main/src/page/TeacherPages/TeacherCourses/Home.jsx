import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  FiArrowUpRight,
  FiAward,
  FiBookOpen,
  FiCalendar,
  FiCheckSquare,
  FiFileText,
  FiUsers,
} from "react-icons/fi";
import { getStoredUser } from "../../../utils/authSession";
import Swal from "sweetalert2";
import {
  cancelBooking,
  getAllBookings,
  invalidateBookings,
  updateBookingStatus,
} from "../../../redux/DemoBooking/DemoBookingSlice";
import DemoBookingsPanel from "./DemoBookingsPanel";
import RescheduleDemoModal from "../../../components/RescheduleDemoModal";
import SavingOverlay from "../../../components/SavingOverlay";
import {
  getTeacherRoleId,
  getUserDisplayName,
} from "../../../utils/roleIdentity";

const liveAreas = [
  {
    title: "Courses",
    description: "View the courses currently assigned to your teacher profile.",
    to: "/teacher/courses",
    icon: FiBookOpen,
    chip: "bg-orange-100 text-orange-600",
  },
  {
    title: "Students",
    description: "Open your live student list and student detail records.",
    to: "/teacher/students",
    icon: FiUsers,
    chip: "bg-sky-100 text-sky-600",
  },
  {
    title: "Assignments",
    description: "Create, review, and remind students about live assignments.",
    to: "/teacher/assignments",
    icon: FiFileText,
    chip: "bg-purple-100 text-purple-600",
  },
  {
    title: "Attendance",
    description: "Review submitted attendance and homework history.",
    to: "/teacher/attendance",
    icon: FiCheckSquare,
    chip: "bg-teal-100 text-teal-600",
  },
  {
    title: "Assessments",
    description: "Manage pending and completed student assessments.",
    to: "/teacher/assessments",
    icon: FiAward,
    chip: "bg-amber-100 text-amber-600",
  },
  {
    title: "Schedule",
    description: "Maintain your live availability and weekly slots.",
    to: "/teacher/schedule",
    icon: FiCalendar,
    chip: "bg-rose-100 text-rose-600",
  },
];

const Dashboard = () => {
  const dispatch = useDispatch();
  const authUser = useSelector((state) => state.auth?.user);
  const { bookings, listLoading: demoLoading, error: demoError } = useSelector(
    (state) => state.demoBookings || {}
  );
  const storedUser = getStoredUser() || {};
  const resolvedUser = authUser || storedUser || {};
  const teacherId = getTeacherRoleId(resolvedUser);
  const teacherName = getUserDisplayName(resolvedUser, "Teacher");
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  useEffect(() => {
    dispatch(getAllBookings(teacherId ? { teacherId } : {}));
  }, [dispatch, teacherId]);

  const handleRefreshDemoBookings = () => {
    dispatch(invalidateBookings());
    dispatch(getAllBookings(teacherId ? { teacherId } : {}));
  };

  const [updatingBookingId, setUpdatingBookingId] = useState(null);
  const [reschedulingBooking, setReschedulingBooking] = useState(null);

  const handleUpdateDemoStatus = async (bookingId, demoStatus) => {
    setUpdatingBookingId(bookingId);
    try {
      await dispatch(updateBookingStatus({ id: bookingId, updatedData: { demoStatus } })).unwrap();
      toast.success(`Demo marked as ${demoStatus}`);
    } catch (err) {
      toast.error(typeof err === "string" ? err : err?.message || "Failed to update demo status");
    } finally {
      setUpdatingBookingId(null);
    }
  };

  const handleSaveMeetingLink = async (bookingId, meetingLink) => {
    setUpdatingBookingId(bookingId);
    try {
      await dispatch(updateBookingStatus({ id: bookingId, updatedData: { meetingLink } })).unwrap();
      toast.success(meetingLink ? "Class link shared with the student" : "Class link removed");
    } catch (err) {
      toast.error(
        typeof err === "string" ? err : err?.message || "Failed to save class link"
      );
    } finally {
      setUpdatingBookingId(null);
    }
  };

  const handleCancelDemo = async (booking) => {
    const { isConfirmed, value } = await Swal.fire({
      title: "Cancel this demo?",
      input: "textarea",
      inputLabel: "Reason (the student is told)",
      inputPlaceholder: "Why is this demo being cancelled?",
      showCancelButton: true,
      confirmButtonText: "Cancel demo",
      confirmButtonColor: "#e11d48",
      cancelButtonText: "Keep it",
    });
    if (!isConfirmed) return;

    setUpdatingBookingId(booking._id);
    try {
      const result = await dispatch(
        cancelBooking({ id: booking._id, reason: (value || "").trim() || undefined })
      ).unwrap();
      toast.success(result.message || "Demo cancelled");
      handleRefreshDemoBookings();
    } catch (err) {
      toast.error(typeof err === "string" ? err : err?.message || "Failed to cancel demo");
    } finally {
      setUpdatingBookingId(null);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#fff4ec] via-[#fffaf6] to-white">
      <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6 lg:space-y-8">
        <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#0f172a] via-[#1e1b3a] to-[#3b1d0f] px-6 py-8 text-white sm:px-8 sm:py-10">
          <div className="pointer-events-none absolute -right-12 -top-16 h-64 w-64 rounded-full bg-[#FF6B35]/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-[#47c9c4]/20 blur-3xl" />
          <div className="pointer-events-none absolute left-6 top-4 h-24 w-24 rounded-full bg-[#a855f7]/25 blur-2xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80 ring-1 ring-white/15">
              <FiCalendar className="text-orange-300" />
              {today}
            </span>
            <h1 className="mt-4 text-2xl font-bold sm:text-3xl">
              Welcome back, {teacherName}!
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/60">
              Here's your teaching snapshot — demo bookings, students, and
              schedule at a glance.
            </p>
          </div>
        </section>

        <div className="flex flex-col gap-6 lg:gap-8">
          <section className="order-1 lg:order-2">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">
                Quick access
              </p>
              <h2 className="mt-1 text-lg font-semibold text-gray-900">
                Continue With Live Areas
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              {liveAreas.map(({ icon: Icon, ...item }) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group relative rounded-2xl border border-orange-100/70 bg-white/80 p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-lg sm:rounded-3xl sm:p-5"
                >
                  <FiArrowUpRight className="absolute right-4 top-4 text-slate-300 transition group-hover:text-[#FF6B35]" />
                  <span
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-xl sm:h-10 sm:w-10 sm:rounded-2xl ${item.chip}`}
                  >
                    <Icon size={18} />
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-gray-900 sm:text-base">
                    {item.title}
                  </h3>
                  <p className="mt-1 hidden text-sm leading-6 text-gray-500 sm:block">
                    {item.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          <section className="order-2 lg:order-1">
            <SavingOverlay show={Boolean(updatingBookingId)} />
            <DemoBookingsPanel
              bookings={bookings}
              teacherId={teacherId}
              loading={demoLoading}
              error={demoError}
              onRefresh={handleRefreshDemoBookings}
              onUpdateStatus={handleUpdateDemoStatus}
              onSaveMeetingLink={handleSaveMeetingLink}
              onReschedule={setReschedulingBooking}
              onCancel={handleCancelDemo}
              updatingId={updatingBookingId}
            />
          </section>
        </div>
      </div>

      {reschedulingBooking ? (
        <RescheduleDemoModal
          booking={reschedulingBooking}
          onClose={() => setReschedulingBooking(null)}
          onDone={() => {
            setReschedulingBooking(null);
            handleRefreshDemoBookings();
          }}
        />
      ) : null}
    </div>
  );
};

export default Dashboard;
