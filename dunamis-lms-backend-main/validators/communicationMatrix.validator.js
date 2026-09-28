const { z } = require("zod");

const matrixRuleSchema = z.object({
  learner: z.boolean(),
  instructor: z.boolean(),
  aa: z.boolean(),
  bde: z.boolean(),
  channel: z.enum(["email", "notification"], { error: "Channel must be email or notification." }),
});

module.exports = { matrixRuleSchema };
