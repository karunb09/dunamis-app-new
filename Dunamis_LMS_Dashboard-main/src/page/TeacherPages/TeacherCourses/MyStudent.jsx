import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchTeacherById } from "../../../redux/Intructor/teacherSlice";
import toast from "react-hot-toast";
import StudentDetail from "./StudentDetail";
import DynamicCourseIcon from "../../../components/DynamicCourseIcon";
import { FiGrid, FiList, FiSearch, FiX } from "react-icons/fi";
import { HiMiniUserGroup } from "react-icons/hi2";
import { MdAccessTime } from "react-icons/md";

const MyStudent = () => {
  const dispatch = useDispatch();
  const { selectedTeacher, loading, error } = useSelector((state) => state.teachers);

  const [view, setView] = useState("grid");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState([]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    const teacherId = user?.roleId;
    if (teacherId) {
      dispatch(fetchTeacherById(teacherId))
        .unwrap()
        .catch((err) => toast.error(typeof err === "string" ? err : err?.message || "Failed to load students"));
    } else {
      toast.error("Teacher ID not found");
    }
  }, [dispatch]);

  const teacherData = selectedTeacher || {};
  const apiStudents = teacherData?.students || [];
  const courses = teacherData?.courses || [];

  const students = apiStudents.map((s, i) => {
    const name = `${s.name?.firstName || ""} ${s.name?.lastName || ""}`.trim() || `Student ${i + 1}`;
    const enrolled = s.courses?.[0];
    const courseDetails = courses.find((c) => c._id === enrolled?.id || c._id === enrolled?._id);
    const courseName = courseDetails?.name || enrolled?.name || "No Course Assigned";
    const category = courseDetails?.category;
    const totalModules = courseDetails?.content?.[0]?.modules?.length || 0;
    const currentModule = s.currentModule || 0;

    return {
      id: s.id || s._id || `s-${i}`,
      name,
      subject: courseName,
      category,
      type: courseDetails?.mode === "individual" ? "Individual" : "Group",
      progress: s.progress || 0,
      completion: s.completion || 0,
      module: totalModules > 0 ? `Module ${currentModule} of ${totalModules}` : "No modules",
      time: s.schedule || enrolled?.schedule || "Schedule not set",
      avatar: s.studentDetails?.profilePicture
        ? `${import.meta.env.VITE_IMAGE}${s.studentDetails.profilePicture}`
        : `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}`,
      examPreparation: s.examPreparation || false,
      weeksUntilExam: s.weeksUntilExam || null,
    };
  });

  const examStudents = students.filter((s) => s.examPreparation && s.weeksUntilExam);
  const uniqueCategories = [...new Set(students.map((s) => s.category?.name).filter(Boolean))];

  const filteredStudents = students.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.subject.toLowerCase().includes(search.toLowerCase());
    const matchFilter = activeFilters.length === 0 || activeFilters.includes(s.category?.name);
    return matchSearch && matchFilter;
  });

  const handleStudentClick = (student) => {
    localStorage.setItem("selectedStudentId", student.id);
    setSelectedStudent(student);
  };

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-slate-900" />
          <p className="mt-4 text-sm text-slate-500">Loading students…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-rose-600">{error}</p>
          <button
            onClick={() => { const u = JSON.parse(localStorage.getItem("user")); if (u?.roleId) dispatch(fetchTeacherById(u.roleId)); }}
            className="mt-4 rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-2">
      {selectedStudent ? (
        <StudentDetail onBack={() => setSelectedStudent(null)} />
      ) : (
        <>
          {/* Toolbar */}
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search students…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Category filters */}
              {uniqueCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveFilters((p) => p.includes(cat) ? p.filter((f) => f !== cat) : [...p, cat])}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    activeFilters.includes(cat)
                      ? "border-orange-300 bg-orange-50 text-orange-700"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {cat}
                </button>
              ))}

              {/* View toggle */}
              <div className="ml-2 flex rounded-2xl border border-slate-200 bg-white p-1">
                <button
                  onClick={() => setView("grid")}
                  className={`rounded-xl p-1.5 transition ${view === "grid" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800"}`}
                  title="Grid view"
                >
                  <FiGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setView("list")}
                  className={`rounded-xl p-1.5 transition ${view === "list" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800"}`}
                  title="List view"
                >
                  <FiList className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Active filter chips */}
          {activeFilters.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {activeFilters.map((f) => (
                <span key={f} className="flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700">
                  {f}
                  <button onClick={() => setActiveFilters((p) => p.filter((x) => x !== f))}>
                    <FiX className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {students.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
              <p className="text-sm font-medium text-slate-700">No students assigned yet</p>
              <p className="mt-1 text-sm text-slate-400">Students appear here once they enrol.</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
              <p className="text-sm font-medium text-slate-700">No students found</p>
              <p className="mt-1 text-sm text-slate-400">Try adjusting your search or filters.</p>
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredStudents.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleStudentClick(s)}
                  className="rounded-[24px] border border-slate-200 bg-white p-4 text-left transition hover:shadow-sm"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <img
                      src={s.avatar}
                      alt={s.name}
                      className="h-11 w-11 rounded-full border border-slate-200 object-cover object-top"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{s.name}</p>
                      <p className="truncate text-xs text-slate-500">{s.subject}</p>
                    </div>
                  </div>

                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {s.category && (
                      <span className="flex items-center gap-1 rounded-full border border-slate-200 bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                        <DynamicCourseIcon category={s.category} />
                        {s.category.name}
                      </span>
                    )}
                    <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      <HiMiniUserGroup className="h-3 w-3" /> {s.type}
                    </span>
                  </div>

                  {s.progress > 0 && (
                    <div className="mb-2">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-[#FF6B35]" style={{ width: `${s.progress}%` }} />
                      </div>
                      <p className="mt-1 text-right text-[10px] text-slate-400">{s.progress}% progress</p>
                    </div>
                  )}

                  <p className="truncate text-xs text-slate-500">{s.module}</p>
                  <p className="mt-1 flex items-center gap-1 truncate text-xs text-slate-400">
                    <MdAccessTime className="h-3.5 w-3.5 shrink-0" /> {s.time}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-[24px] border border-slate-200">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Student</th>
                    <th className="px-4 py-3 text-left">Course</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Progress</th>
                    <th className="px-4 py-3 text-left">Module</th>
                    <th className="px-4 py-3 text-left">Schedule</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => handleStudentClick(s)}
                      className="cursor-pointer transition hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <img src={s.avatar} alt={s.name} className="h-8 w-8 rounded-full border border-slate-200 object-cover object-top" />
                          <span className="font-medium text-slate-800">{s.name}</span>
                        </div>
                      </td>
                      <td className="max-w-[160px] truncate px-4 py-3 text-slate-600">{s.subject}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{s.type}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-[#FF6B35]" style={{ width: `${s.progress}%` }} />
                          </div>
                          <span className="text-xs text-slate-500">{s.progress}%</span>
                        </div>
                      </td>
                      <td className="max-w-[140px] truncate px-4 py-3 text-slate-600">{s.module}</td>
                      <td className="max-w-[140px] truncate px-4 py-3 text-slate-500">{s.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Exam prep section */}
          {examStudents.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-4 text-sm font-semibold text-slate-800">Preparing for Exams</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {examStudents.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleStudentClick(s)}
                    className="rounded-[24px] border border-amber-100 bg-amber-50 p-4 text-left transition hover:shadow-sm"
                  >
                    <div className="mb-2 flex items-center gap-3">
                      <img src={s.avatar} alt={s.name} className="h-10 w-10 rounded-full border border-slate-200 object-cover object-top" />
                      <p className="font-semibold text-slate-900">{s.name}</p>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate text-slate-600">{s.subject}</span>
                      <span className="ml-2 flex shrink-0 items-center gap-1 text-xs font-medium text-amber-700">
                        <MdAccessTime className="h-3.5 w-3.5" />
                        {s.weeksUntilExam} {s.weeksUntilExam === 1 ? "week" : "weeks"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default MyStudent;
