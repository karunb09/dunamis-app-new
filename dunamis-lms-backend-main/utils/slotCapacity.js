const UNLIMITED_STUDENTS = 9999;

// Online (no branchId) group classes cap at 5; offline (branchId set) are unlimited.
// Demo and premium (1:1) are always a single student.
const getMaxStudents = ({ slotType, sessionType, branchId } = {}) => {
  if (slotType === "demo") return 1;
  if (sessionType === "premium") return 1;
  return branchId ? UNLIMITED_STUDENTS : 5;
};

const isUnlimited = (max) => Number(max) >= UNLIMITED_STUDENTS;

module.exports = { UNLIMITED_STUDENTS, getMaxStudents, isUnlimited };
