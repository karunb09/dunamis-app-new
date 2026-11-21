const DemoFunnelEvent = require("../model/demoFunnelEvent.model");

// Upsert on {flowId, event} so a step that fires twice (double tap, re-render,
// retry) is counted once.
const recordDemoFunnelEvent = ({ flowId, event, courseId, source, deliveryMode, loggedIn, hasSlots }) =>
  DemoFunnelEvent.updateOne(
    { flowId, event },
    {
      $setOnInsert: {
        flowId,
        event,
        courseId: courseId || null,
        source: source || null,
        deliveryMode: deliveryMode || null,
        loggedIn: Boolean(loggedIn),
        hasSlots: typeof hasSlots === "boolean" ? hasSlots : null,
      },
    },
    { upsert: true }
  );

module.exports = { recordDemoFunnelEvent };
