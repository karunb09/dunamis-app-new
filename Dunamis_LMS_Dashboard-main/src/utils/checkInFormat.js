// Check-in times are IST wall-clock whatever the viewer's device is set to:
// they are compared against IST class times and feed pay.
const IST = "Asia/Kolkata";

export const istDayKey = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: IST }).format(date);

export const shiftDayKey = (dayKey, delta) => {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
};

export const monthRange = (monthKey) => {
  const [y, m] = monthKey.split("-").map(Number);
  return {
    from: `${monthKey}-01`,
    to: new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10),
  };
};

export const shiftMonthKey = (monthKey, delta) => {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
};

export const formatTime = (value, { seconds = false } = {}) =>
  value
    ? new Date(value).toLocaleTimeString("en-IN", {
        timeZone: IST,
        hour: "numeric",
        minute: "2-digit",
        ...(seconds ? { second: "2-digit" } : {}),
      })
    : "—";

export const formatDay = (dayKey) =>
  new Date(`${dayKey}T12:00:00+05:30`).toLocaleDateString("en-IN", {
    timeZone: IST,
    weekday: "short",
    day: "numeric",
    month: "short",
  });

export const formatMonth = (monthKey) =>
  new Date(`${monthKey}-15T12:00:00+05:30`).toLocaleDateString("en-IN", {
    timeZone: IST,
    month: "long",
    year: "numeric",
  });

export const formatDistance = (metres) => {
  if (metres == null) return "—";
  return metres >= 1000 ? `${(metres / 1000).toFixed(1)} km` : `${Math.round(metres)} m`;
};

export const formatDuration = (minutes) => {
  if (minutes == null) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
};

export const mapsUrl = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;

// Same formula as the server (utils/geo.js), for the live "how far am I" preview.
export const distanceMeters = (a, b) => {
  const rad = (deg) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371008.8 * Math.asin(Math.min(1, Math.sqrt(h)));
};

// "YYYY-MM-DDTHH:mm" for a datetime-local input, in IST.
export const toIstInputValue = (value) => {
  const ist = new Date(new Date(value).getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 16);
};

export const fromIstInputValue = (value) => (value ? new Date(`${value}:00+05:30`) : null);

export const rangePresets = (today) => [
  { id: "today", label: "Today", range: { from: today, to: today } },
  { id: "yesterday", label: "Yesterday", range: { from: shiftDayKey(today, -1), to: shiftDayKey(today, -1) } },
  { id: "month", label: "This month", range: { from: `${today.slice(0, 7)}-01`, to: today } },
  { id: "lastMonth", label: "Last month", range: monthRange(shiftMonthKey(today.slice(0, 7), -1)) },
];
