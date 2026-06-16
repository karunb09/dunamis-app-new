const { z } = require("zod");
const { email, nonEmpty, numericString } = require("./common");

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

module.exports = { sendOtpSchema, createStudentSchema };
