import { installmentSummary } from "../../../../../utils/installmentLabel";
import React from "react";
import dayjs from "dayjs";
import { FiActivity, FiCalendar, FiCreditCard } from "react-icons/fi";
import { useStudentOverview } from "../../../../../hooks/useStudents";

const Panel = ({ icon, title, children, className = "" }) => (
    <div className={`rounded-2xl border border-slate-100 bg-white p-5 shadow-sm ${className}`}>
        <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-[#FF6B35]">
                {icon}
            </span>
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        </div>
        {children}
    </div>
);

const EmptyNote = ({ text }) => (
    <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-xs text-slate-400">
        {text}
    </div>
);

const teacherName = (createdBy) => {
    const name = createdBy?.userId?.name;
    return `${name?.firstName || ""} ${name?.lastName || ""}`.trim() || null;
};

const OverviewTab = ({ studentId }) => {
    const { data: overview, isLoading, error } = useStudentOverview(studentId);

    if (isLoading) {
        return <p className="text-sm text-slate-500">Loading overview…</p>;
    }
    if (error) {
        return <p className="text-sm text-rose-500">{error.message || "Failed to load overview."}</p>;
    }

    const upcomingClasses = overview?.upcomingClasses || [];
    const recentActivity = overview?.recentActivity || [];
    const recentPayments = overview?.recentPayments || [];

    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel icon={<FiCalendar size={15} />} title="Upcoming Classes">
                {upcomingClasses.length ? (
                    <div className="space-y-2.5">
                        {upcomingClasses.map((cls) => (
                            <div key={cls._id} className="flex items-start justify-between gap-3 rounded-2xl bg-slate-50/60 px-4 py-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-slate-900">
                                        {cls.courseId?.name || "Class"}
                                        {cls.courseId?.code && (
                                            <span className="ml-1.5 text-xs font-normal text-slate-400">{cls.courseId.code}</span>
                                        )}
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        {dayjs(cls.date).format("ddd, DD MMM")} · {cls.startTime}–{cls.endTime}
                                        {teacherName(cls.createdBy) && ` · ${teacherName(cls.createdBy)}`}
                                    </p>
                                </div>
                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                    cls.branchId ? "bg-sky-50 text-sky-600" : "bg-emerald-50 text-emerald-600"
                                }`}>
                                    {cls.branchId?.branchName || "Online"}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyNote text="No upcoming classes scheduled." />
                )}
            </Panel>

            <Panel icon={<FiActivity size={15} />} title="Recent Activity">
                {recentActivity.length ? (
                    <div className="space-y-2.5">
                        {recentActivity.map((entry) => (
                            <div key={entry._id} className="flex items-start justify-between gap-3 rounded-2xl bg-slate-50/60 px-4 py-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-slate-900">
                                        {entry.courseId?.name || "Class"}
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        {dayjs(entry.date).format("DD MMM YYYY")}
                                        {entry.homework && ` · Homework: ${entry.homework}`}
                                    </p>
                                </div>
                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                    entry.attendanceStatus === "Present"
                                        ? "bg-emerald-50 text-emerald-600"
                                        : "bg-rose-50 text-rose-600"
                                }`}>
                                    {entry.attendanceStatus}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyNote text="No attendance activity recorded yet." />
                )}
            </Panel>

            <Panel icon={<FiCreditCard size={15} />} title="Recent Payments" className="lg:col-span-2">
                {recentPayments.length ? (
                    <div className="space-y-2.5">
                        {recentPayments.map((payment) => (
                            <div key={payment._id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50/60 px-4 py-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-slate-900">
                                        ₹{Number(payment.amount || 0).toLocaleString("en-IN")}
                                        {payment.courseName && (
                                            <span className="ml-1.5 text-xs font-normal text-slate-400">{payment.courseName}</span>
                                        )}
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        {payment.paymentType === "Installment" && payment.installmentNo != null
                                            ? `${installmentSummary(payment)} · `
                                            : ""}
                                        {payment.paidAt
                                            ? `Paid ${dayjs(payment.paidAt).format("DD MMM YYYY")}`
                                            : payment.dueDate
                                                ? `Due ${dayjs(payment.dueDate).format("DD MMM YYYY")}`
                                                : "—"}
                                    </p>
                                </div>
                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                    payment.feeStatus === "Paid"
                                        ? "bg-emerald-50 text-emerald-600"
                                        : "bg-amber-50 text-amber-600"
                                }`}>
                                    {payment.feeStatus || payment.PaymentStatus}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyNote text="No payments recorded yet." />
                )}
            </Panel>
        </div>
    );
};

export default OverviewTab;
