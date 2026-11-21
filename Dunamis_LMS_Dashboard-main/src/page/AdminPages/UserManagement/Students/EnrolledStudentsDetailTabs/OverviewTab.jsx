import { installmentSummary } from "../../../../../utils/installmentLabel";
import React, { useState } from "react";
import dayjs from "dayjs";
import { toast } from "react-hot-toast";
import { FiActivity, FiCalendar, FiCreditCard, FiExternalLink, FiVideo } from "react-icons/fi";
import { useStudentOverview } from "../../../../../hooks/useStudents";
import { saveClassLink } from "../../../../../api/classLinksApi";
import MeetingLinkBlock from "../../../../../components/MeetingLinkBlock";
import { formatDays } from "../../../../../utils/formatDays";
import { getStoredUser } from "../../../../../utils/authSession";
import { hasPermission } from "../../../../../utils/permissions";

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
    const { data: overview, isLoading, error, refetch } = useStudentOverview(studentId);
    const [savingId, setSavingId] = useState(null);
    // Changing a class link is an instructor-management action on the server.
    const canEditLinks = hasPermission(getStoredUser(), "instructorManagement");

    const saveLink = async (parentAvailabilityId, meetingLink) => {
        setSavingId(parentAvailabilityId);
        try {
            const data = await saveClassLink(parentAvailabilityId, meetingLink);
            toast.success(data.message);
            await refetch();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSavingId(null);
        }
    };

    if (isLoading) {
        return <p className="text-sm text-slate-500">Loading overview…</p>;
    }
    if (error) {
        return <p className="text-sm text-rose-500">{error.message || "Failed to load overview."}</p>;
    }

    const upcomingClasses = overview?.upcomingClasses || [];
    const recentActivity = overview?.recentActivity || [];
    const recentPayments = overview?.recentPayments || [];
    const classes = overview?.classes || [];

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
                                <div className="flex shrink-0 flex-col items-end gap-1.5">
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                        cls.branchId ? "bg-sky-50 text-sky-600" : "bg-emerald-50 text-emerald-600"
                                    }`}>
                                        {cls.branchId?.branchName || "Online"}
                                    </span>
                                    {cls.meetingLink && (
                                        <a
                                            href={cls.meetingLink}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-50"
                                        >
                                            <FiExternalLink className="h-3 w-3" />
                                            Join
                                        </a>
                                    )}
                                </div>
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

            <Panel icon={<FiVideo size={15} />} title="Class join links" className="lg:col-span-2">
                {classes.length ? (
                    <>
                        <p className="-mt-2 mb-3 text-xs text-slate-500">
                            One link per weekly class, shared by everyone in it. Students are emailed it 15 minutes before each session.
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {classes.map((cls) => (
                                <div key={cls.parentAvailabilityId} className="rounded-2xl bg-slate-50/60 px-4 py-3">
                                    <p className="truncate text-sm font-medium text-slate-900">
                                        {cls.course?.name || "Class"}
                                        {cls.course?.code && (
                                            <span className="ml-1.5 text-xs font-normal text-slate-400">{cls.course.code}</span>
                                        )}
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        {[formatDays(cls.recurringDays), `${cls.startTime}–${cls.endTime}`, cls.teacherName, cls.branch?.branchName]
                                            .filter(Boolean)
                                            .join(" · ")}
                                    </p>
                                    <MeetingLinkBlock
                                        link={cls.meetingLink}
                                        readOnly={!canEditLinks}
                                        saving={savingId === cls.parentAvailabilityId}
                                        onSave={(next) => saveLink(cls.parentAvailabilityId, next)}
                                        savedHint="Changing it updates the link for every student in this class."
                                        emptyHint={canEditLinks ? "No link yet. Adding one shares it with the whole class." : "No link added yet."}
                                    />
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <EmptyNote text="Not placed in a weekly class yet." />
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
