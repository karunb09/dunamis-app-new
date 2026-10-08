const nodemailer = require("nodemailer");
const MailLog = require("../model/log.model");

const logMailAttempt = async (to, subject, status, error) => {
  try {
    await MailLog.create({ to, subject, status, error });
  } catch (logError) {
    console.error("mail log write error", logError);
  }
};

// The SMTP host intermittently stalls a fresh connection for 20-60s; fail fast and retry so
// a request never outlives nginx's 60s upstream timeout.
const RETRYABLE_CODES = new Set([
  "ETIMEDOUT",
  "ECONNECTION",
  "ESOCKET",
  "ECONNRESET",
  "EDNS",
  "ECONNREFUSED",
]);

let transporter;

const getTransporter = () => {
  if (!transporter) {
    const port = Number(process.env.MAIL_PORT || 465);
    const secure =
      typeof process.env.MAIL_SECURE === "string"
        ? process.env.MAIL_SECURE === "true"
        : port === 465;

    transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port,
      secure,
      pool: true,
      maxConnections: 3,
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 20000,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
  }
  return transporter;
};

const mailSender = async (email, title, body, attachments = []) => {
  const message = {
    from:
      process.env.MAIL_FROM || `Dunamis India <${process.env.MAIL_USER}>`,
    to: `${email}`,
    subject: `${title}`,
    html: `${body}`,
    attachments,
  };

  try {
    let info;
    try {
      info = await getTransporter().sendMail(message);
    } catch (firstError) {
      if (!RETRYABLE_CODES.has(firstError.code)) throw firstError;
      console.warn("email send retrying", firstError.code, email);
      info = await getTransporter().sendMail(message);
    }
    await logMailAttempt(email, title, "sent");
    return info;
  } catch (error) {
    console.error("email sender error", error);
    await logMailAttempt(email, title, "failed", error.message);
    throw error;
  }
};

module.exports = mailSender;
