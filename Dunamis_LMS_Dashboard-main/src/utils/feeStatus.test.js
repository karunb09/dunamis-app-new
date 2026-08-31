import { describe, it, expect } from "vitest";
import { getPendingInstallments, getFeeStatus } from "./feeStatus";
import { installmentSummary } from "./installmentLabel";

// This file mirrors the backend's dues engine (services/enrollmentService.js).
// It has drifted from it once already — the tenure cap here kept billing a
// running-course student who had rolled past their plan, and the missing
// courseType made the UI print "6 of 6" on a course that never ends. These
// tests pin the behaviours that must stay in step.

const DAY_MS = 86400000;
const daysAgo = (n) => new Date(Date.now() - n * DAY_MS);
const inDays = (n) => new Date(Date.now() + n * DAY_MS);

const COURSE = "course-1";

const installment = (overrides = {}) => ({
  courseId: COURSE,
  paymentType: "Installment",
  PaymentStatus: "completed",
  monthlyPaymentStatus: "pending",
  installmentNo: 5,
  installmentTotal: 6,
  installmentAmount: 1750,
  amount: 1750,
  sessionType: "standard",
  dueDate: daysAgo(3),
  ...overrides,
});

const student = (payments, enrolledCourses = [{ courseId: COURSE, status: "in-progress" }]) => ({
  payments,
  enrolledCourses,
});

describe("getPendingInstallments", () => {
  it("keeps billing a running course past the end of its tenure", () => {
    const dues = getPendingInstallments(
      student([installment({ courseType: "running", installmentNo: 6, installmentTotal: 6 })])
    );

    expect(dues).toHaveLength(1);
    expect(dues[0].courseType).toBe("running");
  });

  it("stops a fixed course at its last installment", () => {
    const dues = getPendingInstallments(
      student([installment({ courseType: "fixed", installmentNo: 6, installmentTotal: 6 })])
    );

    expect(dues).toHaveLength(0);
  });

  it("carries courseType through, so the label drops the counter", () => {
    const [due] = getPendingInstallments(
      student([installment({ courseType: "running", dueDate: new Date("2026-09-14") })])
    );

    expect(installmentSummary({ ...due, installmentNo: due.installmentNo + 1 })).toBe("Sept 2026");
  });

  it("still shows a counter on a fixed course", () => {
    const [due] = getPendingInstallments(student([installment({ courseType: "fixed" })]));

    expect(installmentSummary({ ...due, installmentNo: due.installmentNo + 1 })).toBe("6 of 6");
  });

  it("drops paused and discontinued enrollments", () => {
    const payments = [installment({ courseType: "running" })];

    expect(
      getPendingInstallments(student(payments, [{ courseId: COURSE, status: "paused" }]))
    ).toHaveLength(0);
    expect(
      getPendingInstallments(student(payments, [{ courseId: COURSE, status: "discontinued" }]))
    ).toHaveLength(0);
  });

  it("drops a written-off installment", () => {
    const dues = getPendingInstallments(
      student([installment({ courseType: "running", writtenOffAt: daysAgo(1) })])
    );

    expect(dues).toHaveLength(0);
  });

  // The final installment of a fixed course is stored with dueDate null.
  // Skipping it made installment N-1 the "latest" and re-offered an
  // installment the student had already paid.
  it("does not re-offer the settled final installment of a fixed course", () => {
    const dues = getPendingInstallments(
      student([
        installment({ courseType: "fixed", installmentNo: 5, monthlyPaymentStatus: "pending" }),
        installment({
          courseType: "fixed",
          installmentNo: 6,
          monthlyPaymentStatus: "completed",
          dueDate: null,
        }),
      ])
    );

    expect(dues).toHaveLength(0);
  });
});

describe("getFeeStatus", () => {
  it("escalates past the grace window", () => {
    expect(getFeeStatus(student([installment({ dueDate: daysAgo(30) })]))).toBe("Overdue");
    expect(getFeeStatus(student([installment({ dueDate: daysAgo(2) })]))).toBe("Due");
    expect(getFeeStatus(student([installment({ dueDate: inDays(10) })]))).toBe("OnTrack");
  });

  it("does not report a paused student as overdue", () => {
    expect(
      getFeeStatus(
        student([installment({ dueDate: daysAgo(30) })], [{ courseId: COURSE, status: "paused" }])
      )
    ).toBe("Paid");
  });
});
