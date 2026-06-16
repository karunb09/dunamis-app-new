const { z } = require("zod");

// Mongo ObjectId: 24-char hex string. Rejecting malformed IDs at the boundary
// turns a would-be 500 (from `new mongoose.Types.ObjectId(bad)`) into a 400.
const objectId = (label = "id") =>
  z
    .string({ error: `${label} is required.` })
    .trim()
    .regex(/^[a-fA-F0-9]{24}$/, `${label} must be a valid id.`);

const email = z
  .string({ error: "Email is required." })
  .trim()
  .toLowerCase()
  .pipe(z.email("A valid email is required."));

const nonEmpty = (label) =>
  z.string({ error: `${label} is required.` }).trim().min(1, `${label} is required.`);

// Accepts a string or number (JSON bodies send phone/otp/account numbers as
// either) and normalizes to a trimmed string at the boundary.
const numericString = (label, min = 1) =>
  z
    .union([z.string(), z.number()], { error: `${label} is required.` })
    .transform((v) => String(v).trim())
    .refine((v) => v.length >= min, `A valid ${label.toLowerCase()} is required.`);

// Shared :id route-param schema. Used with validate(idParam, "params") to turn
// a malformed ObjectId into a clean 400 instead of a 500 from Mongoose.
const idParam = z.object({ id: objectId("id") });

module.exports = { objectId, email, nonEmpty, numericString, idParam };
