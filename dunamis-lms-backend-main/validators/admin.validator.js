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
});

module.exports = { createAdminSchema, updateAdminSchema };
