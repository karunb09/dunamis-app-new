"use client";

import Link from "next/link";
import { HiAcademicCap, HiClipboardList, HiSparkles, HiTrendingUp } from "react-icons/hi";
import StudentShell from "@/components/student/StudentShell";

const cards = [
  {
    label: "My Courses",
    href: "/student/my-courses",
    icon: HiAcademicCap,
    copy: "Continue enrolled courses and review your session details.",
  },
  {
    label: "Assignments",
    href: "/student/assignments",
    icon: HiClipboardList,
    copy: "Track submissions and upcoming work as this module moves over.",
  },
  {
    label: "Performance",
    href: "/student/performance",
    icon: HiTrendingUp,
    copy: "Review dashboard-style performance charts and trainer feedback.",
  },
];

export default function StudentHomePage() {
  return (
    <StudentShell
      title="Student Dashboard"
      description="The student area is now being built inside the Next.js website. Course access is the first migrated student workflow."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 transition group-hover:bg-orange-600 group-hover:text-white">
                <Icon className="h-6 w-6" />
              </span>
              <h2 className="mt-5 text-lg font-bold text-slate-950">{card.label}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{card.copy}</p>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 rounded-[2rem] border border-orange-100 bg-gradient-to-br from-white via-[#fff8f3] to-[#fff1e8] p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-orange-700 shadow-sm">
              <HiSparkles className="h-4 w-4" />
              Migration started
            </div>
            <h2 className="mt-4 text-2xl font-bold text-slate-950">Next step: enrolled courses</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              This foundation keeps student users in the website while teacher and admin users continue to the legacy dashboard until their portals are migrated.
            </p>
          </div>
          <Link
            href="/courses"
            className="inline-flex items-center justify-center rounded-full bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-700"
          >
            Browse Courses
          </Link>
        </div>
      </div>
    </StudentShell>
  );
}
