/**
 * One-off: re-key the attendanceHomework unique index from
 * { studentId, courseId, date } to { slotId, studentId }.
 *
 * The old key could not tell two same-day classes apart, so a student in two
 * batches of one course on one day collided with E11000 and their attendance
 * was silently lost. Wed-Sat and Sat-Sun both include Saturday, and a course
 * can run both premium (1:1) and standard (group) sections, so this is
 * reachable in normal operation.
 *
 * Dry-runs by default. Idempotent — safe to re-run.
 *
 * Run from dunamis-lms-backend-main/:
 *   node scripts/migrateAttendanceSlotIndex.js            # report only
 *   node scripts/migrateAttendanceSlotIndex.js --confirm  # mutate
 */

require("dotenv").config();
const mongoose = require("mongoose");

const AttendanceHomework = require("../model/attendanceHomework.model");

const CONFIRM = process.argv.includes("--confirm");

const OLD_KEY = { studentId: 1, courseId: 1, date: 1 };
const NEW_UNIQUE_KEY = { slotId: 1, studentId: 1 };
const NEW_LOOKUP_KEY = { studentId: 1, date: -1 };

const sameKey = (a, b) => JSON.stringify(a) === JSON.stringify(b);

async function findDuplicates() {
  return AttendanceHomework.aggregate([
    {
      $group: {
        _id: { slotId: "$slotId", studentId: "$studentId" },
        n: { $sum: 1 },
        docs: {
          $push: {
            _id: "$_id",
            teacherId: "$teacherId",
            courseId: "$courseId",
            date: "$date",
            createdAt: "$createdAt",
            updatedAt: "$updatedAt",
            attendanceStatus: "$attendanceStatus",
            homework: "$homework",
          },
        },
      },
    },
    { $match: { n: { $gt: 1 } } },
  ]);
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URL, {
    maxPoolSize: 2,
    serverSelectionTimeoutMS: 10000,
  });
  console.log(`DB connected — ${CONFIRM ? "APPLYING CHANGES" : "DRY RUN"}\n`);

  const collection = AttendanceHomework.collection;

  // 1. Duplicates first — nothing is dropped or created until these are resolved.
  const duplicates = await findDuplicates();
  if (duplicates.length) {
    console.log(
      `Found ${duplicates.length} (slotId, studentId) group(s) with more than one row.`
    );
    console.log(
      "These predate `date = slot.date`, so two submissions for one class landed on\n" +
        "different calendar days and the old index could not see them as duplicates.\n"
    );
    for (const group of duplicates) {
      console.log(
        `  slot ${group._id.slotId} / student ${group._id.studentId} — ${group.n} rows:`
      );
      console.dir(group.docs, { depth: null });
    }
    console.log("");
  } else {
    console.log("No duplicate (slotId, studentId) pairs.\n");
  }

  if (!CONFIRM) {
    const wouldDelete = duplicates.reduce((sum, g) => sum + g.n - 1, 0);
    console.log("Dry run — no changes made. With --confirm this would:");
    console.log(`  - delete ${wouldDelete} duplicate row(s), keeping the newest by updatedAt`);
    console.log("  - drop the { studentId, courseId, date } unique index");
    console.log("  - create { slotId, studentId } unique and { studentId, date } indexes");
    await mongoose.disconnect();
    return;
  }

  // 2. Keep the newest edit per group; the teacher's latest submission is their intent.
  let deleted = 0;
  for (const group of duplicates) {
    const sorted = [...group.docs].sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
    );
    const [keep, ...drop] = sorted;
    console.log(`Keeping ${keep._id}, deleting ${drop.length}:`);
    console.dir(drop, { depth: null });
    await AttendanceHomework.deleteMany({ _id: { $in: drop.map((d) => d._id) } });
    deleted += drop.length;
  }
  if (deleted) console.log(`\nDeleted ${deleted} duplicate row(s).\n`);

  // 3. Drop the old index by key spec — its generated name is an assumption.
  const existing = await collection.indexes();
  const old = existing.find((idx) => sameKey(idx.key, OLD_KEY));
  if (old) {
    await collection.dropIndex(old.name);
    console.log(`Dropped old index "${old.name}".`);
  } else {
    console.log("Old index already absent.");
  }

  // 4. createIndex is idempotent when the key and options match.
  await collection.createIndex(NEW_UNIQUE_KEY, { unique: true });
  await collection.createIndex(NEW_LOOKUP_KEY);
  console.log("Created { slotId, studentId } (unique) and { studentId, date }.\n");

  console.log("Final indexes:");
  console.dir(await collection.indexes(), { depth: null });

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error("Migration failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
