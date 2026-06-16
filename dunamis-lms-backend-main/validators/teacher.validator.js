const { z } = require("zod");
const { nonEmpty, numericString } = require("./common");

// Bank details are sensitive and immutable once submitted, so validate the
// shape strictly at the boundary (IFSC/account-number format) before persisting.
const bankDetailsSchema = z.looseObject({
  accountHolderName: nonEmpty("Account holder name"),
  accountNumber: numericString("Account number", 6).refine(
    (v) => /^\d{6,20}$/.test(v),
    "A valid account number is required."
  ),
  ifscCode: z
    .string({ error: "IFSC code is required." })
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "A valid IFSC code is required."),
  bankName: nonEmpty("Bank name"),
  branchAddress: z.string().trim().optional(),
});

module.exports = { bankDetailsSchema };
