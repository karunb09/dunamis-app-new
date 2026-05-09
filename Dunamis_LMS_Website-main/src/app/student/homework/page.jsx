"use client";

import { useMemo, useState } from "react";
import { IoSearch } from "react-icons/io5";
import { LuArrowDownUp } from "react-icons/lu";
import { MdOutlineLibraryBooks } from "react-icons/md";
import { RiFilter3Line, RiPenNibFill } from "react-icons/ri";
import StudentShell from "@/components/student/StudentShell";
import { dashboardStyleCourses, homeworkByCourse } from "@/lib/studentMockData";

const levelColor = {
  Beginner: "bg-[#C9E9FA] text-[#43A2DC]",
  Intermediate: "bg-[#FCF4E3] text-[#F5B942]",
  Advanced: "bg-[#FDF7F7] text-[#F26565]",
};

export default function StudentHomeworkPage() {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortDesc, setSortDesc] = useState(false);

  const homeworks = useMemo(() => {
    const list = selectedCourse ? homeworkByCourse[selectedCourse.id] || [] : [];
    const filtered = list.filter((item) => {
      const search = searchTerm.toLowerCase();
      return (
        item.title.toLowerCase().includes(search) ||
        item.homework.toLowerCase().includes(search) ||
        item.homeworkDesc.toLowerCase().includes(search)
      );
    });

    return sortDesc ? [...filtered].reverse() : filtered;
  }, [searchTerm, selectedCourse, sortDesc]);

  return (
    <StudentShell
      title="Homework"
      description="Matches the dashboard homework flow while the backend data source is finalized."
    >
      {!selectedCourse ? (
        <div className="bg-[#fafafa] px-6 py-6 md:px-4">
          <p className="mb-5 text-[12px] text-black/60 md:text-sm">
            Select the course to see your homework and session feedback
          </p>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {dashboardStyleCourses.map((course) => (
              <button
                key={course.id}
                onClick={() => setSelectedCourse(course)}
                className="group relative flex min-h-[120px] w-full items-stretch overflow-hidden rounded-2xl border border-[#EDECF9] bg-white text-left shadow-[0_1px_0_rgba(16,24,40,.04)] transition hover:shadow-md"
                type="button"
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
                  <div className="text-[14.5px] font-semibold leading-snug text-gray-900 md:text-[15px]">
                    {course.title}
                  </div>
                  <div className="mt-1 text-[12px] text-gray-500">by {course.instructor}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <main className="bg-[#fafafa] px-6 py-6 md:px-4">
          <button
            type="button"
            onClick={() => setSelectedCourse(null)}
            className="mb-5 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Back to courses
          </button>
          <div className="relative mb-6 flex w-full flex-col items-center justify-between gap-2 rounded-lg sm:flex-row">
            <div className="relative w-full sm:w-72">
              <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-gray-500" />
              <input
                type="text"
                placeholder="Search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full rounded-full border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm transition focus:outline-none focus:ring-2 focus:ring-[#c2c1c3]"
              />
            </div>

            <button
              type="button"
              onClick={() => setSortDesc((current) => !current)}
              className="flex items-center gap-2 px-3 py-2 text-base transition"
            >
              <RiFilter3Line className="h-5 w-5 text-gray-500" />
              <LuArrowDownUp className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {homeworks.map((item) => (
              <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#21305D] text-white">
                      <RiPenNibFill className="text-lg" />
                    </span>
                    <div>
                      <h3 className="text-base font-semibold text-black">{item.title}</h3>
                      <span className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                        <MdOutlineLibraryBooks className="h-3 w-3" />
                        {item.tag}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{item.date}</span>
                </div>

                <div className="mb-4">
                  <h4 className="mb-1 text-sm font-semibold text-black">{item.homework}</h4>
                  <p className="text-sm text-gray-500">{item.homeworkDesc}</p>
                  {item.feedback ? <p className="mt-3 text-sm text-gray-500">Feedback: {item.feedback}</p> : null}
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                  <div className="flex items-center gap-1 text-gray-600">
                    <MdOutlineLibraryBooks className="text-base" />
                    <span className="text-sm">Lesson {item.lesson}</span>
                  </div>
                  {item.dueDate ? <span className="text-xs text-gray-400">{item.dueDate}</span> : null}
                </div>
              </div>
            ))}
          </div>
        </main>
      )}
    </StudentShell>
  );
}
