const mongoose = require("mongoose");

const DEMO_FUNNEL_EVENTS = ["opened", "slot_chosen", "submitted", "booked"];
const DEMO_FUNNEL_SOURCES = ["course_page", "instructor", "hero", "chatbot", "link"];
const RETENTION_DAYS = 180;

// One row per step a visitor reaches in the website's Book Demo flow. flowId is
// minted in the browser per opening of the modal and is not tied to a person.
const demoFunnelEventSchema = new mongoose.Schema(
  {
    flowId: { type: String, required: true },
    event: { type: String, enum: DEMO_FUNNEL_EVENTS, required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", default: null },
    source: { type: String, enum: [...DEMO_FUNNEL_SOURCES, null], default: null },
    deliveryMode: { type: String, enum: ["online", "offline", null], default: null },
    loggedIn: { type: Boolean, default: false },
    // Only meaningful on "opened": false means the visitor found no demo times.
    hasSlots: { type: Boolean, default: null },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000),
    },
  },
  { timestamps: true }
);

demoFunnelEventSchema.index({ flowId: 1, event: 1 }, { unique: true });
demoFunnelEventSchema.index({ createdAt: 1 });
demoFunnelEventSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("DemoFunnelEvent", demoFunnelEventSchema);
module.exports.DEMO_FUNNEL_EVENTS = DEMO_FUNNEL_EVENTS;
module.exports.DEMO_FUNNEL_SOURCES = DEMO_FUNNEL_SOURCES;
