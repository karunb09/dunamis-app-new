const Counter = require("../model/counter.model");

const ALLOWED_PREFIXES = [
  "DMPL",
  "DSMA",
  "DSMB",
  "DSMI",
  "DSDA",
  "DSDB",
  "DSDI",
  "DCCA",
  "DCCB",
  "DCCI",
];

const EMPLOYEE_ID_REGEX = /^(DMPL|(DSM|DSD|DCC)[AIB])\d{3,}$/;

const resolvePrefix = (employeePrefix, fallback) =>
  ALLOWED_PREFIXES.includes(employeePrefix) ? employeePrefix : fallback;

async function generateEmployeeId(prefix) {
  if (!ALLOWED_PREFIXES.includes(prefix)) {
    throw new Error(`Invalid employee ID prefix: ${prefix}`);
  }
  const counter = await Counter.findOneAndUpdate(
    { _id: prefix },
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true }
  );
  return `${prefix}${String(counter.seq).padStart(3, "0")}`;
}

// Raises the prefix counter so future auto-generation never collides with a manually assigned ID.
async function bumpCounterFloor(employeeId) {
  const match = String(employeeId).match(/^(DMPL|(?:DSM|DSD|DCC)[AIB])(\d+)$/);
  if (!match) return;
  await Counter.updateOne(
    { _id: match[1] },
    { $max: { seq: Number(match[2]) } },
    { upsert: true }
  );
}

module.exports = {
  ALLOWED_PREFIXES,
  EMPLOYEE_ID_REGEX,
  resolvePrefix,
  generateEmployeeId,
  bumpCounterFloor,
};
