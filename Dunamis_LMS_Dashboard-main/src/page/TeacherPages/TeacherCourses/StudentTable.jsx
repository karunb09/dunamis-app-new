import React from "react";
import DynamicCourseIcon from "../../../components/DynamicCourseIcon";
import { formatScheduleLabel } from "../../../utils/formatSchedule";

const StudentRow = ({ student }) => (
  <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
    <td className="py-3 px-4">
      <div className="flex items-center gap-2.5">
        <img
          src={student.avatar}
          alt={student.name}
          className="h-8 w-8 shrink-0 rounded-full border border-slate-200 object-cover object-top"
        />
        <span className="truncate text-sm font-medium text-slate-800">{student.name}</span>
      </div>
    </td>
    <td className="px-4 py-3">
      {student.category ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700">
          <DynamicCourseIcon category={student.category} />
          {student.category.name}
        </span>
      ) : (
        <span className="text-xs text-slate-400">—</span>
      )}
    </td>
    <td className="max-w-[160px] truncate px-4 py-3 text-sm text-slate-600">{student.course}</td>
    <td className="px-4 py-3">
      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-600">
        {student.mode || "Online"}
      </span>
    </td>
    <td className="px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-[#FF6B35]" style={{ width: student.progress }} />
        </div>
        <span className="text-xs text-slate-500">{student.progress}</span>
      </div>
    </td>
    <td className="px-4 py-3 text-sm text-slate-600">{student.modules}</td>
    <td className="px-4 py-3 text-sm text-slate-500">{formatScheduleLabel(student.schedule)}</td>
  </tr>
);

const EmptyState = () => (
  <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
    <p className="text-sm font-medium text-slate-700">Nothing here yet</p>
    <p className="mt-1 text-xs text-slate-400">Students will appear here once they're enrolled.</p>
  </div>
);

const StudentTableSection = ({ title, students }) => (
  <div className="mb-6">
    <h4 className="mb-3 text-sm font-semibold text-slate-800">
      {title} <span className="font-normal text-slate-400">({students.length})</span>
    </h4>
    {students.length === 0 ? (
      <EmptyState />
    ) : (
      <div className="overflow-x-auto rounded-[20px] border border-slate-200">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Student</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Course</th>
              <th className="px-4 py-3 text-left">Mode</th>
              <th className="px-4 py-3 text-left">Progress</th>
              <th className="px-4 py-3 text-left">Modules</th>
              <th className="px-4 py-3 text-left">Schedule</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, index) => (
              <StudentRow key={student.id || index} student={student} />
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

const StudentTable = ({ groupStudents = [], individualStudents = [] }) => {
  return (
    <div className="border-t border-slate-100 pt-6">
      <StudentTableSection title="Group Class Students" students={groupStudents} />
      <StudentTableSection title="Individual Class Students" students={individualStudents} />
    </div>
  );
};

export default StudentTable;
