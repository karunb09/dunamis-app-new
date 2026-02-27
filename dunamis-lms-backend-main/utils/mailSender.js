const nodemailer = require("nodemailer");
const mailSender = async (email, title, body, attachments = []) => {
  try {
    let transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    let info = await transporter.sendMail({
      from: `Dunamis LMS ${process.env.MAIL_USER}`,
      to: `${email}`,
      subject: `${title}`,
      html: `${body}`,
      attachments,
    });
    return info;
  } catch (error) {
    console.error("email sender error", error);
    throw error;
  }
};

module.exports = mailSender;
