const { z } = require("zod");
const { email, nonEmpty, numericString } = require("./common");

// accessLevel / permission may arrive as a string or an array depending on the
// form, so only assert "present and non-empty" without forcing a type.
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
  role: nonEmpty("Role"),
  accessLevel: present("Access level"),
  permission: present("Permission"),
  department: nonEmpty("Department"),
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
  accessLevel: z.any().optional(),
  permission: z.any().optional(),
  department: z.string().trim().optional(),
});

module.exports = { createAdminSchema, updateAdminSchema };
