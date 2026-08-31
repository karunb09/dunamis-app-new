const { z } = require("zod");
const { objectId, email, nonEmpty, numericString } = require("./common");

const sendOtpSchema = z.object({ email });

const createStudentSchema = z
  .looseObject({
    name: z.object({
      firstName: nonEmpty("First name"),
      lastName: nonEmpty("Last name"),
    }),
    email,
    mobileNo: numericString("Mobile number", 7),
    password: z
      .string({ error: "Password is required." })
      .min(6, "Password must be at least 6 characters long."),
    confirmPassword: nonEmpty("Confirm password"),
    otp: numericString("OTP", 4),
    age: z.any().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "password and confirmPassword do not match,please try again",
    path: ["confirmPassword"],
  });

const enrollmentParam = z.object({
  id: objectId("id"),
  courseId: objectId("courseId"),
});

const paymentParam = z.object({
  id: objectId("id"),
  paymentId: objectId("paymentId"),
});

const pauseEnrollmentSchema = z.object({
  reason: z.string().trim().max(500).nullish(),
  // Advisory only — resuming is always an explicit admin action.
  resumeOn: z.coerce.date().nullish(),
});

const discontinueEnrollmentSchema = z.object({
  reason: z.string().trim().max(500).nullish(),
});

// Either a day count or an explicit date; the controller rejects a date that
// is not later than the current one.
const extendDueDateSchema = z
  .object({
    days: z.coerce.number().int().min(1).max(365).nullish(),
    newDueDate: z.coerce.date().nullish(),
    reason: z.string().trim().max(500).nullish(),
  })
  .refine((d) => d.days != null || d.newDueDate != null, {
    message: "Provide either days or newDueDate.",
    path: ["days"],
  });

module.exports = {
  sendOtpSchema,
  createStudentSchema,
  enrollmentParam,
  paymentParam,
  pauseEnrollmentSchema,
  discontinueEnrollmentSchema,
  extendDueDateSchema,
};
