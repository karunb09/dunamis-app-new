const { scheduleWithHeartbeat } = require("../utils/cronHeartbeat");
const { runAssessmentCycle } = require("../services/assessmentCycle");

// 06:00 IST = 00:30 UTC. The worker lives in services/ so tests can drive it
// without requiring this file, which would register a live schedule. Errors are
// deliberately not caught — scheduleWithHeartbeat records them and alerts ops.
scheduleWithHeartbeat("assessmentCycle", "30 0 * * *", runAssessmentCycle);

exports.manualAssessmentCycle = async (req, res) => {
  try {
    await runAssessmentCycle();
    res
      .status(200)
      .json({ success: true, message: "Assessment cycle executed manually" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message || "Internal Error" });
  }
};

exports.runAssessmentCycle = runAssessmentCycle;
