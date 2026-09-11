import axios from "./axios";

// Pure data-access for instructor assessments and certificates. Caching and
// loading state are owned by TanStack Query (see hooks/useAssessments.js).

const toError = (err, fallback) => {
  const data = err.response?.data;
  const msg = typeof data === "string" ? data : data?.message || err.message || fallback;
  const e = new Error(msg || fallback);
  e.response = err.response;
  return e;
};

// responseType "blob" means an error body arrives as a Blob too.
const readBlobMessage = async (blob) => {
  try {
    return JSON.parse(await blob.text())?.message || "";
  } catch {
    return "";
  }
};

export async function fetchTeacherAssessments() {
  try {
    const { data } = await axios.get("/assessment/teacher");
    return data;
  } catch (err) {
    throw toError(err, "Failed to load assessments");
  }
}

export async function sendQuestionnaire(body) {
  try {
    const { data } = await axios.post("/assessment/send", body);
    return data;
  } catch (err) {
    throw toError(err, "Failed to send the questionnaire");
  }
}

export async function scoreAssessment(id, body) {
  try {
    const { data } = await axios.put(`/assessment/submit/${id}`, body);
    return data;
  } catch (err) {
    throw toError(err, "Failed to save the assessment");
  }
}

export async function issueCertificate(id) {
  try {
    const { data } = await axios.post(`/assessment/${id}/certificate`);
    return data;
  } catch (err) {
    throw toError(err, "Failed to issue the certificate");
  }
}

export async function downloadCertificate(certificateId) {
  try {
    const { data } = await axios.get(`/certificates/${certificateId}/certificate.pdf`, {
      responseType: "blob",
    });
    return data;
  } catch (err) {
    const body = err.response?.data;
    if (body instanceof Blob) {
      const message = await readBlobMessage(body);
      if (message) throw new Error(message);
    }
    throw toError(err, "Failed to download the certificate");
  }
}
