
const fs = require("fs");
const path = require("path");

const sendApplicationStatusTemplate = (firstName, email, status) => {
  const statusMessages = {
    new: {
      subject: "Your Application is Under Review",
      body: `
        <p>We have received your application and it's currently under review. Our team will evaluate your details and get back to you shortly.</p>
      `,
    },
    shortlisted: {
      subject: "Congratulations! Your Application Has Been Shortlisted",
      body: `
        <p>We are pleased to inform you that your application has been <strong>accepted</strong>.</p>
        <p>Our team will reach out to you with the next steps soon.</p>
      `,
    },
    rejected: {
      subject: "Update on Your Application",
      body: `
        <p>We appreciate your interest, but unfortunately, your application has been <strong>rejected</strong> at this time.</p>
        <p>Feel free to apply again in the future if your circumstances change.</p>
      `,
    },
    interviewed: {
      subject: "Interview Invitation for Your Application",
      body: `
        <p>Your application has progressed to the next stage. We would like to invite you for an <strong>interview</strong>.</p>
        <p>Our team will contact you shortly to schedule the interview and share further details.</p>
      `,
    },
    selected: {
      subject: "Congratulations! You Have Been Selected",
      body: `
        <p>Congratulations! You have been <strong>selected</strong> for the teaching position.</p>
        <p>Your account credentials (email and password) have been sent to your registered email address.</p>
        <p>Please check your inbox for login details and next steps.</p>
        <p>👉 <a href="https://dashboard.dunamisindia.co.in/">Click here to login</a></p>
      `,
    },
  };

  const selectedStatus = statusMessages[status];

  if (!selectedStatus) {
    throw new Error("Invalid application status");
  }

  // return only HTML email template
  return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${selectedStatus.subject}</title>
      <style>
        body {
          background-color: #f9f9f9;
          font-family: Arial, sans-serif;
          font-size: 16px;
          line-height: 1.5;
          color: #333333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background: #ffffff;
          border-radius: 10px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.1);
          text-align: center;
        }
        .logo {
          max-width: 200px;
          margin-bottom: 20px;
        }
        .message {
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 20px;
          color: #222222;
        }
        .body {
          font-size: 16px;
          margin-bottom: 20px;
          text-align: left;
        }
        .support {
          font-size: 14px;
          color: #777777;
          margin-top: 20px;
        }
        a {
          color: #007BFF;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <a href="https://www.dunamisindia.co.in/">
          <img class="logo" src="cid:dunamis-logo" alt="Dunamis India Logo">
        </a>
        <div class="message">${selectedStatus.subject}</div>
        <div class="body">
          <p>Hello <strong>${firstName || "Applicant"}</strong>,</p>
          ${selectedStatus.body}
          <p>Thank you for your interest and effort.</p>
          <p>Best regards,<br>Dunamis Team</p>
        </div>
        <div class="support">
          If you have any questions or need assistance, please reach out at 
          <a href="mailto:info@Dunamis.com">info@Dunamis.com</a>.
        </div>
      </div>
    </body>
    </html>`;
};

sendApplicationStatusTemplate.attachments = () => {
  const logoPath = path.join(__dirname, "../Dunamis.png");

  if (!fs.existsSync(logoPath)) {
    return [];
  }

  return [
    {
      filename: "Dunamis India.png",
      path: logoPath,
      cid: "dunamis-logo",
    },
  ];
};

module.exports = sendApplicationStatusTemplate;
