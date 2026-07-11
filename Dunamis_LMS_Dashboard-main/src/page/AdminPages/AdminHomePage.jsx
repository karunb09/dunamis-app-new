import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  FiArrowUpRight,
  FiAward,
  FiBookOpen,
  FiCalendar,
  FiEdit3,
  FiFileText,
  FiMail,
  FiMapPin,
  FiMessageSquare,
  FiTrendingUp,
  FiUserCheck,
  FiUsers,
} from "react-icons/fi";
import { getStoredToken } from "../../utils/authSession";

const BASE_URL = import.meta.env.VITE_BASE_URL;

const ALL_QUICK_LINKS = [
  {
    title: "Courses",
    description: "Manage live course records, pricing, content, and media.",
    to: "/admin/course-management",
    permission: "courseManagement",
    icon: FiBookOpen,
    chip: "bg-orange-100 text-orange-600",
  },
  {
    title: "Students",
    description: "Review registered, demo, and enrolled student records.",
    to: "/admin/student-management",
    permission: "studentManagement",
    icon: FiUsers,
    chip: "bg-sky-100 text-sky-600",
  },
  {
    title: "Instructors",
    description: "Manage instructors and teacher applications.",
    to: "/admin/instructor-management",
    permission: "instructorManagement",
    icon: FiUserCheck,
    chip: "bg-purple-100 text-purple-600",
  },
  {
    title: "Offline Centres",
    description: "Maintain cities, zones, branches, and centre details.",
    to: "/admin/centers",
    permission: "offlineCenters",
    icon: FiMapPin,
    chip: "bg-teal-100 text-teal-600",
  },
  {
    title: "Website Content",
    description: "Edit FAQs, testimonials, and success stories.",
    to: "/admin/site-content",
    permission: "contentManagement",
    icon: FiEdit3,
    chip: "bg-amber-100 text-amber-600",
  },
  {
    title: "Enquiries",
    description: "Respond to website contact form submissions.",
    to: "/admin/enquiries",
    permission: "enquiries",
    icon: FiMessageSquare,
    chip: "bg-rose-100 text-rose-600",
  },
];

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

export default function AdminHomePage() {
  const { user } = useSelector((state) => state.auth);
  const permissions = user?.permissions || [];
  const hasFullAccess = permissions.length === 0 || permissions.includes("allAccess");
  const firstName = user?.name?.firstName || "Admin";
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const quickLinks = useMemo(() => {
    if (hasFullAccess) return ALL_QUICK_LINKS;
    return ALL_QUICK_LINKS.filter((link) => permissions.includes(link.permission));
  }, [hasFullAccess, permissions]);

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadSummary = async () => {
      try {
        setLoading(true);
        const token = getStoredToken();
        const response = await axios.get(`${BASE_URL}/dashboard/admin-summary`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          withCredentials: true,
        });

        if (isMounted) {
          setSummary(response.data?.data || {});
          setError("");
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.message || err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadSummary();

    return () => {
      isMounted = false;
    };
  }, []);

  const metrics = useMemo(
    () => [
      {
        label: "Total Students",
        value: summary?.totalStudents ?? 0,
        icon: FiUsers,
        chip: "from-[#FF6B35] to-amber-400",
      },
      {
        label: "Active Courses",
        value: summary?.activeCourses ?? 0,
        icon: FiBookOpen,
        chip: "from-teal-500 to-emerald-400",
      },
      {
        label: "Instructors",
        value: summary?.totalInstructors ?? 0,
        icon: FiAward,
        chip: "from-purple-500 to-fuchsia-400",
      },
      {
        label: "Revenue",
        value: formatCurrency(summary?.revenue),
        icon: FiTrendingUp,
        chip: "from-emerald-500 to-lime-400",
      },
      {
        label: "New Enquiries",
        value: summary?.newEnquiries ?? 0,
        icon: FiMail,
        chip: "from-sky-500 to-cyan-400",
      },
      {
        label: "Pending Applications",
        value: summary?.pendingApplications ?? 0,
        icon: FiFileText,
        chip: "from-amber-500 to-yellow-400",
      },
      {
        label: "Booked Demos",
        value: summary?.bookedDemos ?? 0,
        icon: FiCalendar,
        chip: "from-rose-500 to-pink-400",
      },
      {
        label: "Active Branches",
        value: summary?.activeBranches ?? 0,
        icon: FiMapPin,
        chip: "from-indigo-500 to-violet-400",
      },
    ],
    [summary]
  );

  return (
    <main className="w-full flex-1 overflow-y-auto bg-gradient-to-b from-[#fff4ec] via-[#fffaf6] to-white">
      <div className="mx-auto max-w-7xl space-y-6 p-4 lg:space-y-8 lg:p-6">
        <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#0f172a] via-[#1e1b3a] to-[#3b1d0f] px-6 py-8 text-white sm:px-8 sm:py-10">
          <div className="pointer-events-none absolute -right-12 -top-16 h-64 w-64 rounded-full bg-[#FF6B35]/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-[#47c9c4]/20 blur-3xl" />
          <div className="pointer-events-none absolute left-6 top-4 h-24 w-24 rounded-full bg-[#a855f7]/25 blur-2xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80 ring-1 ring-white/15">
              <FiCalendar className="text-orange-300" />
              {today}
            </span>
            <h2 className="mt-4 text-2xl font-bold sm:text-3xl">
              Welcome back, {firstName}!
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/60">
              Here's a live snapshot of students, courses, revenue, and activity
              across Dunamis.
            </p>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-6 lg:gap-8">
          <section className="order-1 lg:order-2">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">
                Quick access
              </p>
              <h3 className="mt-1 text-lg font-semibold text-gray-900">
                Live Management Areas
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              {quickLinks.map(({ icon: Icon, ...item }) => (
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
                  <h4 className="mt-3 text-sm font-semibold text-gray-900 sm:text-base">
                    {item.title}
                  </h4>
                  <p className="mt-1 hidden text-sm leading-6 text-gray-500 sm:block">
                    {item.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          <section className="order-2 lg:order-1">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">
                Overview
              </p>
              <h3 className="mt-1 text-lg font-semibold text-gray-900">
                Today's Snapshot
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
              {metrics.map(({ icon: Icon, ...metric }) => (
                <div
                  key={metric.label}
                  className="rounded-2xl border border-white bg-white/80 p-4 shadow-sm backdrop-blur transition hover:shadow-md sm:rounded-3xl sm:p-5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-gray-500 sm:text-sm">{metric.label}</p>
                    <span
                      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ${metric.chip}`}
                    >
                      <Icon size={15} />
                    </span>
                  </div>
                  {loading ? (
                    <div className="mt-3 h-7 w-20 animate-pulse rounded-lg bg-slate-100" />
                  ) : (
                    <p className="mt-2 truncate text-xl font-bold text-gray-900 sm:text-2xl">
                      {metric.value}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
