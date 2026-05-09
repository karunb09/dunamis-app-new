"use client";

import { useMemo, useState } from "react";
import StudentShell from "@/components/student/StudentShell";
import { dashboardStyleCourses, monthlyPerformance, performanceByCourse } from "@/lib/studentMockData";

const colors = {
  Homework: "#23305d",
  Practice: "#a0e2c4",
  Speed: "#fbafb2",
  Performance: "#dfc6f8",
};

const levelColor = {
  Beginner: "bg-[#C9E9FA] text-[#43A2DC]",
  Intermediate: "bg-[#FCF4E3] text-[#F5B942]",
  Advanced: "bg-[#FDF7F7] text-[#F26565]",
};

function CourseCard({ course, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-auto cursor-pointer overflow-hidden rounded-xl border bg-white text-left shadow-sm transition hover:shadow-md ${
        selected ? "border-[#f3f4f6] ring-2 ring-[#d8dcfa]" : "border-[#f3f4f6]"
      }`}
    >
      <div className="h-[120px] w-[150px] overflow-hidden sm:w-[210px] md:w-[230px]">
        <img src={course.image} alt={course.title} className="h-full w-full object-cover" />
      </div>
      <div className="flex flex-1 flex-col justify-center px-4 py-3">
        <div className="mb-2 flex flex-wrap gap-2">
          <span className="inline-flex h-6 items-center rounded-full bg-[#DDF4FA] px-2 py-[2px] text-[11px] font-medium leading-none text-black">
            {course.category}
          </span>
          <span className={`inline-flex h-6 items-center rounded-full px-2 py-[2px] text-[11px] font-medium leading-none ${levelColor[course.level] || "bg-gray-100 text-gray-500"}`}>
            {course.level}
          </span>
        </div>
        <div className="mb-1 text-sm font-semibold text-[#111827] sm:text-base">{course.title}</div>
        <div className="text-xs text-[#6b7280] sm:text-sm">by {course.instructor}</div>
      </div>
    </button>
  );
}

function Legend({ color, label }) {
  return (
    <div className="flex items-center gap-2 text-sm text-[#111827]">
      <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </div>
  );
}

function PerformanceBars({ data }) {
  return (
    <div className="h-[300px] overflow-x-auto rounded-2xl bg-white px-4 py-6 sm:px-6 lg:h-[340px]">
      <div className="flex h-full min-w-[520px] items-end gap-6 border-b border-l border-gray-100 px-3 pb-3">
        {data.map((month) => {
          const total = month.Homework + month.Practice + month.Speed + month.Performance;
          return (
            <div key={month.month} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
              <div className="flex h-[230px] w-7 flex-col justify-end overflow-hidden rounded-md bg-gray-50">
                {Object.keys(colors).map((key) => (
                  <div
                    key={key}
                    title={`${key}: ${month[key]}`}
                    style={{
                      height: `${(month[key] / Math.max(total, 1)) * 100}%`,
                      backgroundColor: colors[key],
                    }}
                  />
                ))}
              </div>
              <span className="text-xs font-medium text-[#111827]">{month.month}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function StudentPerformancePage() {
  const [selectedCourse, setSelectedCourse] = useState(dashboardStyleCourses[0]);
  const feedbackList = useMemo(
    () => performanceByCourse[selectedCourse?.id]?.feedback || [],
    [selectedCourse],
  );

  return (
    <StudentShell
      title="My Performance"
      description="Dashboard-style monthly stats and trainer feedback. This keeps visual parity while real reporting APIs are defined."
    >
      <div className="w-full px-4 py-6" style={{ fontFamily: "Inter, sans-serif" }}>
        <p className="mb-5 text-[12px] text-black/60 md:text-sm">
          Select the course to see your performance and feedback!
        </p>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {dashboardStyleCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              selected={selectedCourse?.id === course.id}
              onClick={() => setSelectedCourse(course)}
            />
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-10 lg:flex-row">
          <div className="mt-6 w-full flex-1">
            <h3 className="mb-1 text-lg font-semibold text-[#111827]">{selectedCourse?.title}</h3>
            <p className="mb-4 text-sm text-[#6b7280]">Check your monthly stats</p>
            <div className="rounded-2xl border border-[#f3f4f6] bg-white shadow">
              <PerformanceBars data={monthlyPerformance} />
            </div>
            <div className="mt-5 flex flex-wrap gap-4">
              {Object.entries(colors).map(([label, color]) => (
                <Legend key={label} color={color} label={label} />
              ))}
            </div>
          </div>

          <div className="w-full lg:max-w-sm">
            <h3 className="mb-1 text-lg font-semibold text-[#111827]">Feedback</h3>
            <p className="mb-4 text-sm text-[#6b7280]">Here is what your trainers think.</p>
            <div>
              {feedbackList.map((item) => (
                <div key={item.date} className="mb-5">
                  <div className="mb-1 text-base font-semibold text-[#111827]">{item.date}</div>
                  <p className="text-sm leading-snug text-[#6b7280]">{item.feedback}</p>
                </div>
              ))}
            </div>
            <button className="w-full rounded-lg border border-[#e5e7eb] bg-white px-5 py-2 text-sm font-medium text-[#111827] transition hover:bg-gray-50 sm:w-auto">
              View All
            </button>
          </div>
        </div>
      </div>
    </StudentShell>
  );
}
