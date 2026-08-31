// Mirrors getLatestInstallmentPerEnrollment on the backend: the newest
// completed installment per enrollment group carries the live dueDate.
//
// Deliberately does NOT require a dueDate — the final installment of a fixed
// course is stored with dueDate null, and skipping it here would make
// installment N-1 the "latest" and re-offer an installment already paid.
const getLatestPerEnrollment = (student) => {
    const latestByGroup = new Map();
    for (const p of student?.payments || []) {
        if (p.paymentType !== "Installment" || p.PaymentStatus !== "completed") continue;
        const key = `${p.courseId?._id || p.courseId || ""}:${p.slotId || ""}:${p.sessionType || ""}`;
        const prev = latestByGroup.get(key);
        if (!prev || (p.installmentNo || 0) > (prev.installmentNo || 0)) latestByGroup.set(key, p);
    }
    return [...latestByGroup.values()];
};

// Courses an admin has paused or discontinued: those stop accruing dues.
const frozenCourseIds = (student) =>
    new Set(
        (student?.enrolledCourses || [])
            .filter((e) => e.status === "paused" || e.status === "discontinued")
            .map((e) => String(e.courseId?._id || e.courseId))
    );

// Installments this student still owes, overdue or not. Mirrors the backend's
// getPayableInstallments so the cash-recording modal offers exactly what
// POST /payments/cash-installment will accept.
export const getPendingInstallments = (student, now = new Date()) => {
    const frozen = frozenCourseIds(student);

    return getLatestPerEnrollment(student)
        .filter(
            (p) =>
                p.monthlyPaymentStatus === "pending" &&
                p.dueDate &&
                !p.writtenOffAt &&
                !frozen.has(String(p.courseId?._id || p.courseId))
        )
        // A running course has no last installment to count towards, so the
        // tenure cap applies to fixed courses only.
        .filter(
            (p) =>
                p.courseType === "running" ||
                (p.installmentNo || 0) + 1 <= (p.installmentTotal || 1)
        )
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
            courseType: p.courseType || "fixed",
            termMonths: p.termMonths || null,
            isOverdue: new Date(p.dueDate) < now,
        }))
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
};

// Days past the due date before a late installment escalates from "Due" to
// "Overdue". Matches the 0-7 / 8-30 aging bucket the Financials dues tab uses.
export const FEE_GRACE_DAYS = 7;

const DAY_MS = 86400000;

// Worst state across the student's enrollments wins, so one late course is not
// hidden by another that is paid up.
const SEVERITY = { Overdue: 0, Due: 1, OnTrack: 2, Paid: 3 };

// "OnTrack"  - plan running, next installment not due yet
// "Due"      - due date passed, within the grace window
// "Overdue"  - due date passed by more than FEE_GRACE_DAYS
// "Paid"     - nothing left to pay on any enrollment
export const getFeeStatus = (student, now = new Date()) => {
    const payments = (student?.payments || []).filter((p) => p.PaymentStatus !== "failed");
    if (!payments.length) return "Due";

    // Derived from getPendingInstallments rather than a second filter of its
    // own, so paused, discontinued and written-off rows drop out of the badge
    // exactly as they drop out of the outstanding-fees list.
    let worst = null;
    for (const due of getPendingInstallments(student, now)) {
        const daysLate = Math.floor((now - new Date(due.dueDate)) / DAY_MS);
        const state = daysLate > FEE_GRACE_DAYS ? "Overdue" : daysLate >= 0 ? "Due" : "OnTrack";
        if (worst === null || SEVERITY[state] < SEVERITY[worst]) worst = state;
    }

    if (worst) return worst;

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
