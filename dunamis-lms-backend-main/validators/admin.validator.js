const { z } = require("zod");
const { email, nonEmpty, numericString } = require("./common");

// permission may arrive as a string or an array depending on the form, so
// only assert "present and non-empty" without forcing a type.
const present = (label) =>
  z
    .any()
    .refine(
      (v) =>
        v !== undefined &&
        v !== null &&
        v !== "" &&
        !(Array.isArray(v) && v.length === 0),
      `${label} is required.`
    );

// Dates arrive from <input type="date"> as YYYY-MM-DD.
const isoDate = (label) =>
  z
    .string({ error: `${label} is required.` })
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} must be a date.`)
    .refine((value) => !Number.isNaN(new Date(value).getTime()), `${label} must be a date.`);

const hrFields = {
  dateOfBirth: isoDate("Date of birth")
    .refine((value) => new Date(value) < new Date(), "Date of birth must be in the past.")
    .or(z.literal(""))
    .optional(),
  emergencyContact: z
    .object({
      name: z.string().trim().optional(),
      relation: z.string().trim().optional(),
      phone: z
        .string()
        .trim()
        .regex(/^\d{10}$/, "Emergency contact phone must be 10 digits.")
        .or(z.literal(""))
        .optional(),
    })
    .optional(),
  address: z.string().trim().max(500, "Address must be 500 characters or fewer.").optional(),
};

const createAdminSchema = z.looseObject({
  name: z.object({
    firstName: nonEmpty("First name"),
    lastName: nonEmpty("Last name"),
  }),
  email,
  mobileNo: numericString("Mobile number", 7),
  role: nonEmpty("Job title"),
  permission: present("Permission"),
  // Shape only; services/orgPlacement.js checks the reporting line and scope.
  org: z.looseObject({ designation: nonEmpty("Designation") }),
  dateOfJoining: isoDate("Date of joining"),
  ...hrFields,
});

// Update is a partial patch — every field optional, validated only if sent.
const updateAdminSchema = z.looseObject({
  name: z
    .object({
      firstName: z.string().trim().optional(),
      lastName: z.string().trim().optional(),
    })
    .optional(),
  email: email.optional(),
  mobileNo: z.union([z.string(), z.number()]).optional(),
  role: z.string().trim().optional(),
  permission: z.any().optional(),
  org: z.looseObject({ designation: nonEmpty("Designation") }).optional(),
  dateOfJoining: isoDate("Date of joining").optional(),
  ...hrFields,
});

module.exports = { createAdminSchema, updateAdminSchema };
