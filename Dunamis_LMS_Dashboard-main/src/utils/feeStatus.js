// Mirrors getLatestInstallmentPerEnrollment on the backend: only the newest
// completed installment per enrollment group carries the live dueDate.
const getLatestPerEnrollment = (student) => {
    const latestByGroup = new Map();
    for (const p of student?.payments || []) {
        if (p.paymentType !== "Installment" || p.PaymentStatus !== "completed" || !p.dueDate) continue;
        const key = `${p.courseId?._id || p.courseId || ""}:${p.slotId || ""}:${p.sessionType || ""}`;
        const prev = latestByGroup.get(key);
        if (!prev || (p.installmentNo || 0) > (prev.installmentNo || 0)) latestByGroup.set(key, p);
    }
    return [...latestByGroup.values()];
};

// Installments this student still owes, overdue or not. Mirrors the backend's
// getPayableInstallments so the cash-recording modal offers exactly what
// POST /payments/cash-installment will accept.
export const getPendingInstallments = (student, now = new Date()) =>
    getLatestPerEnrollment(student)
        .filter((p) => p.monthlyPaymentStatus === "pending")
        .filter((p) => (p.installmentNo || 0) + 1 <= (p.installmentTotal || 1))
        .map((p) => ({
            payment: p,
            courseId: p.courseId?._id || p.courseId || null,
            course: p.courseId?.name ? { name: p.courseId.name, code: p.courseId.code } : null,
            slotId: p.slotId || null,
            sessionType: p.sessionType || null,
            amountDue: p.installmentAmount || p.amount,
            dueDate: p.dueDate,
            installmentNo: p.installmentNo || 0,
            installmentTotal: p.installmentTotal || 1,
            isOverdue: new Date(p.dueDate) < now,
        }))
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

export const getFeeStatus = (student, now = new Date()) => {
    const payments = (student?.payments || []).filter((p) => p.PaymentStatus !== "failed");
    if (!payments.length) return "Due";

    let anyUpcoming = false;
    for (const latest of getLatestPerEnrollment(student)) {
        if (latest.monthlyPaymentStatus === "pending") {
            if (new Date(latest.dueDate) < now) return "Overdue";
            anyUpcoming = true;
        }
    }
    if (anyUpcoming) return "Due";

    return payments.some((p) => p.PaymentStatus === "completed") ? "Paid" : "Due";
};

export const getJoinDate = (student) => {
    const joined = (student?.enrolledCourses || [])
        .map((c) => c.joinedAt)
        .filter(Boolean)
        .map((d) => new Date(d));
    if (joined.length) return new Date(Math.min(...joined));

    const paid = (student?.payments || [])
        .filter((p) => p.PaymentStatus === "completed" && p.paidAt)
        .map((p) => new Date(p.paidAt));
    if (paid.length) return new Date(Math.min(...paid));

    return student?.createdAt ? new Date(student.createdAt) : null;
};
