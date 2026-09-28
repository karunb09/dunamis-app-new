const { z } = require("zod");
const { objectId } = require("./common");

// IST calendar days stay YYYY-MM-DD strings; the service converts them.
const dayKey = (label) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `${label} must be YYYY-MM-DD.`);

const fixFields = {
  lat: z
    .number({ error: "Location is required." })
    .min(-90, "Latitude is out of range.")
    .max(90, "Latitude is out of range."),
  lng: z
    .number({ error: "Location is required." })
    .min(-180, "Longitude is out of range.")
    .max(180, "Longitude is out of range."),
  accuracyM: z
    .number({ error: "Location accuracy is required." })
    .positive("Location accuracy is required.")
    .max(100000, "Location accuracy is out of range."),
  // Geolocation's position.timestamp, epoch ms. Stored for audit only.
  deviceTime: z.coerce.date().nullish(),
};

const checkInSchema = z.object({
  branchId: objectId("branchId"),
  ...fixFields,
});

const checkOutSchema = z.object(fixFields);

const checkInReportQuerySchema = z.object({
  from: dayKey("from").nullish(),
  to: dayKey("to").nullish(),
  teacherId: objectId("teacherId").nullish(),
  branchId: objectId("branchId").nullish(),
});

const checkInHistoryQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "month must be YYYY-MM.")
    .nullish(),
});

const checkInNoteSchema = z.object({
  note: z
    .string({ error: "Write a note." })
    .trim()
    .min(1, "Write a note.")
    .max(500, "Keep the note under 500 characters."),
  correctedCheckOutAt: z.coerce.date({ error: "Corrected check-out must be a valid time." }).nullish(),
});

module.exports = {
  checkInSchema,
  checkOutSchema,
  checkInReportQuerySchema,
  checkInHistoryQuerySchema,
  checkInNoteSchema,
};
