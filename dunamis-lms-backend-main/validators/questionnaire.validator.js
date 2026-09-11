const { z } = require("zod");
const { objectId } = require("./common");

const questionSchema = z
  .object({
    prompt: z.string().trim().min(1, "Every question needs a prompt.").max(500),
    type: z.enum(["fill_blank", "checkbox"]),
    options: z.array(z.string().trim().min(1)).max(20).nullish(),
    required: z.boolean().nullish(),
  })
  .refine(
    (q) => q.type !== "checkbox" || (q.options || []).length >= 1,
    "A checkbox question needs at least one option."
  );

const questionnaireBodySchema = z.object({
  title: z.string().trim().min(1, "Give the questionnaire a title.").max(200),
  description: z.string().trim().max(1000).nullish(),
  courseId: objectId("courseId").nullish(),
  level: z.enum(["beginner", "intermediate", "advanced"]).nullish(),
  status: z.enum(["draft", "published"]).nullish(),
  questions: z.array(questionSchema).max(50).nullish(),
});

const questionnaireUpdateSchema = questionnaireBodySchema.partial();

const questionnaireListQuerySchema = z.object({
  status: z.enum(["draft", "published"]).nullish(),
  courseId: objectId("courseId").nullish(),
});

module.exports = {
  questionnaireBodySchema,
  questionnaireUpdateSchema,
  questionnaireListQuerySchema,
};
