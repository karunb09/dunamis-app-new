const Counter = require("../model/counter.model");
const EmployeeUnit = require("../model/employeeUnit.model");

const CENTRAL_PREFIX = "DMPL";

// Every database starts with these; All Access admins add the rest from the
// dashboard. A default can be renamed or deactivated, never deleted.
const DEFAULT_UNITS = [
  { code: "DSM", name: "Dunamis School of Music" },
  { code: "DSD", name: "Dunamis School of Dance" },
  { code: "DCC", name: "Dunamis Chess Club" },
  { code: "DLH", name: "Dunamis Language Hub" },
];

// Format only. Whether the unit exists is a database question (isAllowedPrefix).
const EMPLOYEE_ID_REGEX = /^(DMPL|[A-Z]{3}[AIB])\d{3,}$/;
const ID_PARTS = /^(DMPL|([A-Z]{3})[AIB])(\d+)$/;
const UNIT_PREFIX = /^([A-Z]{3})[AIB]$/;

const unitError = (message, hint) =>
  Object.assign(new Error(message), { statusCode: 400, hint });

const isDefaultUnit = (code) => DEFAULT_UNITS.some((unit) => unit.code === code);

// Inserts any missing default (fresh database, or prod before the first read);
// $setOnInsert never undoes a rename or deactivation.
async function listUnits() {
  const units = await EmployeeUnit.find().sort({ code: 1 }).lean();
  const have = new Set(units.map((unit) => unit.code));
  const missing = DEFAULT_UNITS.filter((unit) => !have.has(unit.code));
  if (!missing.length) return units;

  await EmployeeUnit.bulkWrite(
    missing.map((unit) => ({
      updateOne: { filter: { code: unit.code }, update: { $setOnInsert: unit }, upsert: true },
    }))
  );
  return EmployeeUnit.find().sort({ code: 1 }).lean();
}

async function isAllowedPrefix(prefix, { activeOnly = true } = {}) {
  if (prefix === CENTRAL_PREFIX) return true;
  const code = UNIT_PREFIX.exec(prefix || "")?.[1];
  if (!code) return false;
  const unit = (await listUnits()).find((item) => item.code === code);
  return Boolean(unit && (!activeOnly || unit.isActive));
}

// No pick means the caller's default unit. A pick that isn't an active unit is
// refused, never quietly swapped for the default.
async function resolvePrefix(employeePrefix, fallback) {
  const prefix = employeePrefix ? String(employeePrefix).trim().toUpperCase() : fallback;
  if (!(await isAllowedPrefix(prefix))) {
    throw unitError(
      `${prefix} isn't an active employee unit.`,
      "Pick another unit, or ask an admin with All Access to add or reactivate it under Admins → Employee units."
    );
  }
  return prefix;
}

async function generateEmployeeId(prefix) {
  if (!(await isAllowedPrefix(prefix))) {
    throw unitError(`Invalid employee ID prefix: ${prefix}`);
  }
  const counter = await Counter.findOneAndUpdate(
    { _id: prefix },
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true }
  );
  return `${prefix}${String(counter.seq).padStart(3, "0")}`;
}

const employeeIdPrefix = (employeeId) => ID_PARTS.exec(String(employeeId))?.[1] || null;

// Raises the prefix counter so future auto-generation never collides with a manually assigned ID.
async function bumpCounterFloor(employeeId) {
  const match = ID_PARTS.exec(String(employeeId));
  if (!match) return;
  await Counter.updateOne(
    { _id: match[1] },
    { $max: { seq: Number(match[3]) } },
    { upsert: true }
  );
}

module.exports = {
  CENTRAL_PREFIX,
  DEFAULT_UNITS,
  EMPLOYEE_ID_REGEX,
  bumpCounterFloor,
  employeeIdPrefix,
  generateEmployeeId,
  isAllowedPrefix,
  isDefaultUnit,
  listUnits,
  resolvePrefix,
};
