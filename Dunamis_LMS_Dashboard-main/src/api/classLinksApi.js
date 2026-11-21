import axios from "./axios";

const toError = (err, fallback) => {
  const e = new Error(err.response?.data?.message || err.message || fallback);
  e.response = err.response;
  return e;
};

// An instructor's weekly classes with their join links. Admins pass the
// instructor's teacherId; instructors leave it out to get their own.
export async function fetchClassLinks(teacherId) {
  try {
    const { data } = await axios.get("/slots/my-classes", {
      params: teacherId ? { teacherId } : {},
    });
    return data.classes || [];
  } catch (err) {
    throw toError(err, "Failed to load classes");
  }
}

// Sets the standing link for every session of one weekly class.
export async function saveClassLink(parentAvailabilityId, meetingLink) {
  try {
    const { data } = await axios.patch(`/slots/class/${parentAvailabilityId}/meeting-link`, {
      meetingLink,
    });
    return data;
  } catch (err) {
    throw toError(err, "Failed to save link");
  }
}
