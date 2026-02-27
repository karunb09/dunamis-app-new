const calculateHours = (slots) => {
  if (!slots || !slots.length) return 0;
  return slots.reduce((sum, s) => {
    if (!s.startTime || !s.endTime) return sum;
    const start = new Date(`1970-01-01T${s.startTime}:00`);
    const end = new Date(`1970-01-01T${s.endTime}:00`);
    const hours = (end - start) / (1000 * 60 * 60);
    return sum + (isNaN(hours) ? 0 : hours);
  }, 0);
};

module.exports = { calculateHours };
