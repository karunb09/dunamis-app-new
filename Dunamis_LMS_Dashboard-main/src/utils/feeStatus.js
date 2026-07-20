export const getFeeStatus = (student, now = new Date()) => {
    const payments = (student?.payments || []).filter((p) => p.PaymentStatus !== "failed");
    if (!payments.length) return "Due";

    const latestByGroup = new Map();
    for (const p of payments) {
        if (p.paymentType !== "Installment" || p.PaymentStatus !== "completed" || !p.dueDate) continue;
        const key = `${p.courseId?._id || p.courseId || ""}:${p.slotId || ""}:${p.sessionType || ""}`;
        const prev = latestByGroup.get(key);
        if (!prev || (p.installmentNo || 0) > (prev.installmentNo || 0)) latestByGroup.set(key, p);
    }

    let anyUpcoming = false;
    for (const latest of latestByGroup.values()) {
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
