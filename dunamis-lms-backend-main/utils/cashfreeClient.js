const axios = require("axios");
const crypto = require("crypto");

const API_VERSION = process.env.CASHFREE_API_VERSION || "2025-01-01";

const getCashfreeMode = () => {
  const mode = String(process.env.CASHFREE_ENV || "sandbox").toLowerCase();
  return mode === "production" ? "production" : "sandbox";
};

const getCashfreeBaseUrl = () =>
  getCashfreeMode() === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";

const requireCashfreeConfig = () => {
  if (!process.env.CASHFREE_CLIENT_ID || !process.env.CASHFREE_CLIENT_SECRET) {
    throw new Error("Cashfree credentials are not configured");
  }
};

const cashfreeHeaders = (idempotencyKey) => {
  requireCashfreeConfig();

  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "x-api-version": API_VERSION,
    "x-client-id": process.env.CASHFREE_CLIENT_ID,
    "x-client-secret": process.env.CASHFREE_CLIENT_SECRET,
    ...(idempotencyKey ? { "x-idempotency-key": idempotencyKey } : {}),
  };
};

const createCashfreeOrder = async (payload, idempotencyKey) => {
  const response = await axios.post(`${getCashfreeBaseUrl()}/orders`, payload, {
    headers: cashfreeHeaders(idempotencyKey),
  });

  return response.data;
};

const getCashfreeOrder = async (orderId) => {
  const response = await axios.get(
    `${getCashfreeBaseUrl()}/orders/${encodeURIComponent(orderId)}`,
    { headers: cashfreeHeaders() }
  );

  return response.data;
};

const getCashfreePaymentsForOrder = async (orderId) => {
  const response = await axios.get(
    `${getCashfreeBaseUrl()}/orders/${encodeURIComponent(orderId)}/payments`,
    { headers: cashfreeHeaders() }
  );

  return response.data;
};

const safeCompare = (left, right) => {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));

  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const verifyCashfreeWebhookSignature = ({ signature, timestamp, rawBody }) => {
  requireCashfreeConfig();

  if (!signature || !timestamp || !rawBody) return false;

  const generatedSignature = crypto
    .createHmac("sha256", process.env.CASHFREE_CLIENT_SECRET)
    .update(`${timestamp}${rawBody}`)
    .digest("base64");

  return safeCompare(generatedSignature, signature);
};

module.exports = {
  API_VERSION,
  getCashfreeMode,
  createCashfreeOrder,
  getCashfreeOrder,
  getCashfreePaymentsForOrder,
  verifyCashfreeWebhookSignature,
};
