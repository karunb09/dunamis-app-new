import axios from "./axios";
import { clean, toError } from "./checkInApi";

// Pure data-access for AA/BDE branch check-ins. Caching/loading/error are owned
// by TanStack Query (see hooks/useStaffCheckIns.js).

export async function fetchMyStaffToday() {
  try {
    const { data } = await axios.get("/staff-check-ins/me/today");
    return data;
  } catch (err) {
    throw toError(err, "Failed to load today's check-ins");
  }
}

export async function fetchMyStaffHistory(month) {
  try {
    const { data } = await axios.get("/staff-check-ins/me", { params: clean({ month }) });
    return data;
  } catch (err) {
    throw toError(err, "Failed to load your check-in history");
  }
}

export async function submitStaffCheckIn(body) {
  try {
    const { data } = await axios.post("/staff-check-ins", body);
    return data;
  } catch (err) {
    throw toError(err, "Check-in failed");
  }
}

export async function submitStaffCheckOut(id, body) {
  try {
    const { data } = await axios.post(`/staff-check-ins/${id}/check-out`, body);
    return data;
  } catch (err) {
    throw toError(err, "Check-out failed");
  }
}

export async function fetchStaffCheckInReport(params = {}) {
  try {
    const { data } = await axios.get("/staff-check-ins", { params: clean(params) });
    return data;
  } catch (err) {
    throw toError(err, "Failed to load the staff check-in report");
  }
}

export async function addStaffCheckInNote(id, body) {
  try {
    const { data } = await axios.post(`/staff-check-ins/${id}/notes`, body);
    return data;
  } catch (err) {
    throw toError(err, "Failed to save the note");
  }
}
