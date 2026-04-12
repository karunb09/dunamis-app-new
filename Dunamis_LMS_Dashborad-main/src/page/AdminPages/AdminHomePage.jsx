import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { getStoredToken } from "../../utils/authSession";

const BASE_URL = import.meta.env.VITE_BASE_URL;

const quickLinks = [
  {
    title: "Courses",
    description: "Manage live course records, pricing, content, and media.",
    to: "/admin/course-management",
  },
  {
    title: "Students",
    description: "Review registered, demo, and enrolled student records.",
    to: "/admin/student-management",
  },
  {
    title: "Instructors",
    description: "Manage instructors and teacher applications.",
    to: "/admin/instructor-management",
  },
  {
    title: "Offline Centres",
    description: "Maintain cities, zones, branches, and centre details.",
    to: "/admin/centers",
  },
  {
    title: "Website Content",
    description: "Edit FAQs, testimonials, and success stories.",
    to: "/admin/site-content",
  },
  {
    title: "Enquiries",
    description: "Respond to website contact form submissions.",
    to: "/admin/enquiries",
  },
];

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

export default function AdminHomePage() {
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
      },
      {
        label: "Active Courses",
        value: summary?.activeCourses ?? 0,
      },
      {
        label: "Instructors",
        value: summary?.totalInstructors ?? 0,
      },
      {
        label: "Revenue",
        value: formatCurrency(summary?.revenue),
      },
      {
        label: "New Enquiries",
        value: summary?.newEnquiries ?? 0,
      },
      {
        label: "Pending Applications",
        value: summary?.pendingApplications ?? 0,
      },
      {
        label: "Booked Demos",
        value: summary?.bookedDemos ?? 0,
      },
      {
        label: "Active Branches",
        value: summary?.activeBranches ?? 0,
      },
    ],
    [summary]
  );

  return (
    <main className="flex-1 p-4 lg:p-6 overflow-y-auto w-full">
      <div className="mb-6">
        <h2 className="text-lg md:text-2xl font-semibold">
          Welcome back, Admin!
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          Dashboard summaries now come from backend counts instead of static
          numbers.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-gray-500">{metric.label}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {loading ? "..." : metric.value}
            </p>
          </div>
        ))}
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Live Management Areas
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {quickLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
            >
              <h4 className="text-base font-semibold text-gray-900">
                {item.title}
              </h4>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                {item.description}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
