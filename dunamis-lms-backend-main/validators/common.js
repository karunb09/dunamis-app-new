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

module.exports = { objectId, email, nonEmpty };
