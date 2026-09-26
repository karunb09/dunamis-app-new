import axios from "./axios";

// Pure data-access for instructor pay. Caching/loading/error are owned by
// TanStack Query (see hooks/useInstructorPay.js).

const toError = (err, fallback) => {
  const data = err.response?.data;
  const msg = typeof data === "string" ? data : data?.message || err.message || fallback;
  const e = new Error(msg || fallback);
  e.response = err.response;
  return e;
};

export async function fetchPayoutsForMonth(params = {}) {
  try {
    const { data } = await axios.get("/remuneration/month", { params });
    return data;
  } catch (err) {
    throw toError(err, "Failed to load payouts");
  }
}

export async function fetchPayoutsForTeacher(teacherId) {
  try {
    const { data } = await axios.get(`/remuneration/${teacherId}`);
    return data;
  } catch (err) {
    throw toError(err, "Failed to load payouts");
  }
}

export async function generatePayouts(body) {
  try {
    const { data } = await axios.post("/remuneration/generate", body);
    return data;
  } catch (err) {
    throw toError(err, "Failed to generate payouts");
  }
}

export async function saveAdjustments(id, adjustments) {
  try {
    const { data } = await axios.patch(`/remuneration/${id}/adjustments`, {
      adjustments,
    });
    return data;
  } catch (err) {
    throw toError(err, "Failed to save adjustments");
  }
}

export async function approvePayout(id) {
  try {
    const { data } = await axios.post(`/remuneration/${id}/approve`);
    return data;
  } catch (err) {
    throw toError(err, "Failed to approve payout");
  }
}

export async function setPayStatus(id, body) {
  try {
    const { data } = await axios.patch(`/remuneration/${id}/pay-status`, body);
    return data;
  } catch (err) {
    throw toError(err, "Failed to update pay status");
  }
}

// responseType "blob" means an error body arrives as a Blob too, so the
// server's message has to be read back out rather than picked off .data.
const readBlobMessage = async (blob) => {
  try {
    return JSON.parse(await blob.text())?.message || "";
  } catch {
    return "";
  }
};

// The payslip is a PDF stream, not JSON — the caller turns it into a blob URL.
export async function downloadPayslip(id) {
  try {
    const { data } = await axios.get(`/remuneration/${id}/payslip.pdf`, {
      responseType: "blob",
    });
    return data;
  } catch (err) {
    const body = err.response?.data;
    if (body instanceof Blob) {
      const message = await readBlobMessage(body);
      if (message) {
        const e = new Error(message);
        e.response = err.response;
        throw e;
      }
    }
    throw toError(err, "Failed to prepare payslip");
  }
}

export async function fetchRates() {
  try {
    const { data } = await axios.get("/instructor-rates");
    return data;
  } catch (err) {
    throw toError(err, "Failed to load rate card");
  }
}

export async function createRate(body) {
  try {
    const { data } = await axios.post("/instructor-rates", body);
    return data;
  } catch (err) {
    throw toError(err, "Failed to save rate");
  }
}

export async function updateRate(id, body) {
  try {
    const { data } = await axios.put(`/instructor-rates/${id}`, body);
    return data;
  } catch (err) {
    throw toError(err, "Failed to update rate");
  }
}

export async function deleteRate(id) {
  try {
    const { data } = await axios.delete(`/instructor-rates/${id}`);
    return data;
  } catch (err) {
    throw toError(err, "Failed to remove rate");
  }
}

export async function fetchPayConfig() {
  try {
    const { data } = await axios.get("/instructor-rates/config");
    return data;
  } catch (err) {
    throw toError(err, "Failed to load pay settings");
  }
}

export async function updatePayConfig(body) {
  try {
    const { data } = await axios.put("/instructor-rates/config", body);
    return data;
  } catch (err) {
    throw toError(err, "Failed to save pay settings");
  }
}
