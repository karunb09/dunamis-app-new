const { z } = require("zod");
const { email, nonEmpty } = require("./common");

const loginSchema = z.object({
  email,
  password: nonEmpty("Password"),
});

const forgotPasswordSchema = z.object({
  email,
});

const verifyOtpSchema = z.object({
  email,
  otp: z
    .string({ error: "OTP is required." })
    .trim()
    .min(4, "OTP must be at least 4 digits."),
});

const resetPasswordSchema = z.object({
  email,
  otp: z
    .string({ error: "OTP is required." })
    .trim()
    .min(4, "OTP must be at least 4 digits."),
  newPassword: z
    .string({ error: "New password is required." })
    .min(6, "Password must be at least 6 characters long."),
});

module.exports = {
  loginSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema,
};
