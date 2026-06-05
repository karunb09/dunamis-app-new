"use client";

import { HiChartBar, HiChatAlt2, HiClock } from "react-icons/hi";
import StudentShell from "@/components/student/StudentShell";

const UPCOMING = [
  {
    icon: HiChartBar,
    title: "Monthly Progress Charts",
    description: "Track your homework completion, practice hours, speed, and overall performance month-by-month.",
  },
  {
    icon: HiChatAlt2,
    title: "Instructor Feedback",
    description: "Read session-by-session notes and evaluations submitted by your trainer after each class.",
  },
  {
    icon: HiClock,
    title: "Attendance & Consistency",
    description: "View your attendance record and streak to understand how consistency affects your progress.",
  },
];

export default function StudentPerformancePage() {
  return (
    <StudentShell
      title="My Performance"
      description="Your personalised performance reports will appear here once they are available."
    >
      <div className="rounded-[2rem] border border-orange-100 bg-gradient-to-br from-white via-[#fff8f3] to-[#fff1e8] p-8 shadow-sm sm:p-10">
        <div className="mx-auto max-w-lg text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-orange-700">
            Coming soon
          </span>

          <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Performance reporting is on its way
          </h2>

          <p className="mt-3 text-sm leading-7 text-slate-600">
            Your instructors are actively recording your progress. Once the reporting
            module is live, you will see your full history here — no action needed
            from your side.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
          {UPCOMING.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-[1.5rem] border border-orange-100 bg-white p-5 shadow-sm"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-sm font-bold text-slate-950">{title}</h3>
              <p className="mt-1.5 text-xs leading-5 text-slate-500">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </StudentShell>
  );
}
