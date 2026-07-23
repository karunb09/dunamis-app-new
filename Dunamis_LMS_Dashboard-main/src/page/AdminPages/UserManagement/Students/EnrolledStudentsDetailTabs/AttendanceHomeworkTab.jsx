import React, { useState } from "react";
import dayjs from "dayjs";
import { FiBookOpen, FiCheckCircle, FiXCircle, FiPercent } from "react-icons/fi";
import { useStudentAttendanceHomework } from "../../../../../hooks/useStudents";

const Stat = ({ icon, label, value, tone = "slate" }) => {
    const tones = {
        slate: "bg-slate-50 text-slate-600",
        emerald: "bg-emerald-50 text-emerald-600",
        rose: "bg-rose-50 text-rose-600",
        orange: "bg-orange-50 text-[#FF6B35]",
    };
    return (
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2.5">
                <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${tones[tone]}`}>
                    {icon}
                </span>
                <div>
                    <p className="text-lg font-semibold leading-none text-slate-900">{value}</p>
                    <p className="mt-1 text-xs text-slate-500">{label}</p>
                </div>
            </div>
        </div>
    );
};

const EmptyNote = ({ text }) => (
    <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-xs text-slate-400">
        {text}
    </div>
);

const AttendanceHomeworkTab = ({ studentId }) => {
    const [courseId, setCourseId] = useState("");
    const { data, isLoading, error } = useStudentAttendanceHomework(studentId, courseId || undefined);

    if (isLoading) {
        return <p className="text-sm text-slate-500">Loading attendance &amp; homework…</p>;
    }
    if (error) {
        return <p className="text-sm text-rose-500">{error.message || "Failed to load attendance & homework."}</p>;
    }

    const summary = data?.summary || { total: 0, present: 0, absent: 0, attendancePct: 0 };
    const courses = data?.courses || [];
    const records = data?.records || [];

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat icon={<FiBookOpen size={15} />} label="Total Classes" value={summary.total} tone="orange" />
                <Stat icon={<FiCheckCircle size={15} />} label="Present" value={summary.present} tone="emerald" />
                <Stat icon={<FiXCircle size={15} />} label="Absent" value={summary.absent} tone="rose" />
                <Stat icon={<FiPercent size={15} />} label="Attendance" value={`${summary.attendancePct}%`} tone="slate" />
            </div>

            {courses.length > 1 && (
                <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-slate-500">Course</label>
                    <select
                        value={courseId}
                        onChange={(e) => setCourseId(e.target.value)}
                        className="rounded-2xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                    >
                        <option value="">All courses</option>
                        {courses.map((c) => (
                            <option key={c._id} value={c._id}>{c.name || "Untitled"}</option>
                        ))}
                    </select>
                </div>
            )}

            {records.length ? (
                <div className="space-y-2.5">
                    {records.map((r) => (
                        <div key={r._id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-slate-900">
                                        {r.courseName || "Class"}
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        {dayjs(r.date).format("ddd, DD MMM YYYY")}
                                        {r.teacherName && ` · ${r.teacherName}`}
                                    </p>
                                </div>
                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                    r.attendanceStatus === "Present"
                                        ? "bg-emerald-50 text-emerald-600"
                                        : "bg-rose-50 text-rose-600"
                                }`}>
                                    {r.attendanceStatus}
                                </span>
                            </div>
                            {(r.module || r.lesson || r.topic) && (
                                <p className="mt-2 text-xs text-slate-500">
                                    {[r.module, r.lesson, r.topic].filter(Boolean).join(" · ")}
                                </p>
                            )}
                            {r.homework && (
                                <p className="mt-2 rounded-xl bg-slate-50/70 px-3 py-2 text-xs text-slate-600">
                                    <span className="font-medium text-slate-700">Homework: </span>
                                    {r.homework}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <EmptyNote text="No attendance or homework recorded yet." />
            )}
        </div>
    );
};

export default AttendanceHomeworkTab;
