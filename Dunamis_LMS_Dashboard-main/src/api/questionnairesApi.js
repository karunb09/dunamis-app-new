import axios from "./axios";

// Pure data-access for the instructor's questionnaire library.

const toError = (err, fallback) => {
  const data = err.response?.data;
  const msg = typeof data === "string" ? data : data?.message || err.message || fallback;
  const e = new Error(msg || fallback);
  e.response = err.response;
  return e;
};

export async function fetchQuestionnaires(params = {}) {
  try {
    const { data } = await axios.get("/questionnaires", { params });
    return data;
  } catch (err) {
    throw toError(err, "Failed to load questionnaires");
  }
}

export async function createQuestionnaire(body) {
  try {
    const { data } = await axios.post("/questionnaires", body);
    return data;
  } catch (err) {
    throw toError(err, "Failed to save the questionnaire");
  }
}

export async function updateQuestionnaire(id, body) {
  try {
    const { data } = await axios.put(`/questionnaires/${id}`, body);
    return data;
  } catch (err) {
    throw toError(err, "Failed to save the questionnaire");
  }
}

export async function duplicateQuestionnaire(id) {
  try {
    const { data } = await axios.post(`/questionnaires/${id}/duplicate`);
    return data;
  } catch (err) {
    throw toError(err, "Failed to duplicate the questionnaire");
  }
}

export async function deleteQuestionnaire(id) {
  try {
    const { data } = await axios.delete(`/questionnaires/${id}`);
    return data;
  } catch (err) {
    throw toError(err, "Failed to delete the questionnaire");
  }
}
