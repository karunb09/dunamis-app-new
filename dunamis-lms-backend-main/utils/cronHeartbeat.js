const cron = require("node-cron");
const CronRun = require("../model/cronRun.model");
const { sendOpsAlert } = require("./opsAlert");

const record = async (name, update) => {
  try {
    await CronRun.updateOne({ name }, { $set: update }, { upsert: true });
  } catch (err) {
    console.error(`[CronHeartbeat] ${name}:`, err.message);
  }
};

const scheduleWithHeartbeat = (
  name,
  schedule,
  worker,
  { timezone = "UTC", intervalHours = 24 } = {}
) => {
  record(name, { schedule, intervalHours });

  cron.schedule(
    schedule,
    async () => {
      const startedAt = Date.now();
      try {
        await worker();
        await record(name, {
          lastRunAt: new Date(startedAt),
          lastStatus: "success",
          lastError: null,
          lastDurationMs: Date.now() - startedAt,
        });
      } catch (err) {
        await record(name, {
          lastRunAt: new Date(startedAt),
          lastStatus: "error",
          lastError: err.message,
          lastDurationMs: Date.now() - startedAt,
        });
        sendOpsAlert({ title: `Cron failed: ${name}`, message: err.message });
      }
    },
    { timezone }
  );
};

module.exports = { scheduleWithHeartbeat };
