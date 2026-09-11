const { z } = require("zod");
const { objectId } = require("./common");

const createAssignmentSchema = z.object({
  courseId: objectId("courseId"),
  studentIds: z.array(objectId("studentId")).min(1, "Pick at least one learner.").max(100),
  title: z.string().trim().min(1, "Give the assignment a title.").max(200),
  description: z.string().trim().max(2000).nullish(),
  dueDate: z.coerce.date({ error: "Pick a due date." }),
});

const reviewSubmissionSchema = z.object({
  assignmentId: objectId("assignmentId"),
  studentId: objectId("studentId"),
  feedback: z.string().trim().max(2000).nullish(),
  rating: z.coerce.number().int().min(1).max(5).nullish(),
});

module.exports = { createAssignmentSchema, reviewSubmissionSchema };
