import axios from "./axios";

// Admin controls over an enrollment's life. The due-date endpoint is the only
// way a due date moves outside the payment-fulfillment path.

const toError = (err, fallback) => {
  const data = err.response?.data;
  const message =
    typeof data === "string" ? data : data?.message || err.message || fallback;
  const e = new Error([message, data?.hint].filter(Boolean).join(" "));
  e.response = err.response;
  return e;
};

const patch = async (url, body, fallback) => {
  try {
    const { data } = await axios.patch(url, body);
    return data;
  } catch (err) {
    throw toError(err, fallback);
  }
};

export const pauseEnrollment = ({ studentId, courseId, reason, resumeOn }) =>
  patch(
    `/student/${studentId}/enrollment/${courseId}/pause`,
    { reason, resumeOn },
    "Failed to pause the enrollment"
  );

export const resumeEnrollment = ({ studentId, courseId }) =>
  patch(
    `/student/${studentId}/enrollment/${courseId}/resume`,
    {},
    "Failed to resume the enrollment"
  );

export const discontinueEnrollment = ({ studentId, courseId, reason }) =>
  patch(
    `/student/${studentId}/enrollment/${courseId}/discontinue`,
    { reason },
    "Failed to discontinue the enrollment"
  );

export const extendDueDate = ({ studentId, paymentId, days, newDueDate, reason }) =>
  patch(
    `/student/${studentId}/payment/${paymentId}/extend-due-date`,
    { days, newDueDate, reason },
    "Failed to extend the due date"
  );
