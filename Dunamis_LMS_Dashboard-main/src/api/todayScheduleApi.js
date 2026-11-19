import axios from "./axios";

export async function fetchTodaySchedule() {
  try {
    const { data } = await axios.get("/reports/today-schedule");
    return data;
  } catch (err) {
    const data = err.response?.data;
    const e = new Error(data?.message || err.message || "Failed to load today's schedule");
    e.response = err.response;
    throw e;
  }
}
