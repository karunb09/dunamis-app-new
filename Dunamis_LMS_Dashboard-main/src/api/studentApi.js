import axios from "./axios";

// Pure data-access for the Student domain (admin student-management screens).
// Caching/loading/error are owned by TanStack Query (see hooks/useStudents.js).
// The bearer token is attached by the axios request interceptor.

const toError = (err, fallback) => {
  const data = err.response?.data;
  const msg = typeof data === "string" ? data : data?.message || err.message || fallback;
  const e = new Error(msg || fallback);
  e.response = err.response;
  return e;
};

// Returns the grouped-by-type shape the UI expects, e.g. { enrolled: [...], ... }.
// The server sends one student list plus ID sets for the two subsets, so the
// grouping is rebuilt here rather than shipped three times over the wire.
export async function fetchStudentsByType(type) {
  try {
    const { data } = await axios.get("/student/get-by-type", {
      params: type ? { type } : {},
    });
    const students = data.students || [];
    const enrolled = new Set((data.enrolledIds || []).map(String));
    const demo = new Set((data.demoIds || []).map(String));
    return {
      ...data,
      registered: students,
      enrolled: students.filter((s) => enrolled.has(String(s._id))),
      demo: students.filter((s) => demo.has(String(s._id))),
    };
  } catch (err) {
    throw toError(err, "Failed to load students");
  }
}

export async function fetchStudentById(id) {
  try {
    const { data } = await axios.get(`/student/${id}`);
    return data?.student ?? null;
  } catch (err) {
    throw toError(err, "Failed to load student");
  }
}

export async function fetchStudentOverview(id) {
  try {
    const { data } = await axios.get(`/student/${id}/overview`);
    return data?.overview ?? null;
  } catch (err) {
    throw toError(err, "Failed to load student overview");
  }
}

export async function fetchStudentAttendanceHomework(id, params = {}) {
  try {
    const { data } = await axios.get(`/student/${id}/attendance-homework`, { params });
    return {
      summary: data?.summary ?? { total: 0, present: 0, absent: 0, attendancePct: 0 },
      courses: data?.courses ?? [],
      records: data?.records ?? [],
    };
  } catch (err) {
    throw toError(err, "Failed to load attendance & homework");
  }
}

export async function updateStudent(id, payload) {
  try {
    const { data } = await axios.put(`/student/${id}`, payload);
    return data?.student ?? data;
  } catch (err) {
    throw toError(err, "Failed to update student");
  }
}
