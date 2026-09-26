const { scheduleWithHeartbeat } = require("../utils/cronHeartbeat");
const { runAssignmentCycle } = require("../services/assignmentCycle");

// The worker lives in services/ so tests can drive it without requiring this
// file, which would register a live schedule.
scheduleWithHeartbeat("assignmentCycle", "0 0 * * *", runAssignmentCycle);

exports.manualAssignmentCycle = async (req, res) => {
  try {
    const { force } = req.query;
    await runAssignmentCycle(force === "true");
    res.status(200).json({
      success: true,
      message: force
        ? "Assignment cycle executed manually (FORCE_MODE)"
        : "Assignment cycle executed manually",
    });
  } catch (error) {
    console.error("Manual assignment cycle error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.runAssignmentCycle = runAssignmentCycle;
