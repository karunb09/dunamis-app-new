const nodemailer = require("nodemailer");
const MailLog = require("../model/log.model");

const logMailAttempt = async (to, subject, status, error) => {
  try {
    await MailLog.create({ to, subject, status, error });
  } catch (logError) {
    console.error("mail log write error", logError);
  }
};

const mailSender = async (email, title, body, attachments = []) => {
  try {
    const port = Number(process.env.MAIL_PORT || 465);
    const secure =
      typeof process.env.MAIL_SECURE === "string"
        ? process.env.MAIL_SECURE === "true"
        : port === 465;

    let transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port,
      secure,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    let info = await transporter.sendMail({
      from:
        process.env.MAIL_FROM ||
        `Dunamis India <${process.env.MAIL_USER}>`,
      to: `${email}`,
      subject: `${title}`,
      html: `${body}`,
      attachments,
    });
    await logMailAttempt(email, title, "sent");
    return info;
  } catch (error) {
    console.error("email sender error", error);
    await logMailAttempt(email, title, "failed", error.message);
    throw error;
  }
};

module.exports = mailSender;
