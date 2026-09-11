const { z } = require("zod");
const { objectId } = require("./common");

const sendQuestionnaireSchema = z.object({
  questionnaireId: objectId("questionnaireId"),
  assessmentIds: z
    .array(objectId("assessmentId"))
    .min(1, "Pick at least one learner.")
    .max(100),
});

// Positional: answers line up with the snapshot's questions array, so a
// reordered questionnaire cannot mismatch an answer to a prompt.
const submitResponseSchema = z.object({
  videoUrl: z
    .string()
    .trim()
    .max(500)
    .refine(
      (value) => value === "" || /^https?:\/\/\S+$/.test(value),
      "Enter a valid link starting with http:// or https://"
    )
    .nullish(),
  answers: z
    .array(
      z.object({
        text: z.string().trim().max(2000).nullish(),
        selected: z.array(z.string().trim().max(200)).max(20).nullish(),
      })
    )
    .max(50),
});

module.exports = { sendQuestionnaireSchema, submitResponseSchema };
