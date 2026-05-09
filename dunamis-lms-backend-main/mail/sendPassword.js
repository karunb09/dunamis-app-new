const DEFAULT_DASHBOARD_URL =
  process.env.DASHBOARD_URL || "https://dashboard.dunamisindia.co.in";

const sendPasswordTemplate = (user, role, password) => {
    const { name, email } = user;
    return `
      <p>Hello <strong>${name.firstName}</strong>,</p>
      <p>Your <strong>${role}</strong> account has been successfully created in the <strong>LMS system</strong>.</p>
      <p><strong>Here are your login credentials:</strong></p>
      <ul>
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Temporary Password:</strong> ${password}</li>
      </ul>
      <p>Please log in using the above credentials and <strong>change your password</strong> immediately after your first login for security purposes.</p>
      <p>Use the Dunamis Staff Portal to access your dashboard:</p>
      <p><a href="${DEFAULT_DASHBOARD_URL}">${DEFAULT_DASHBOARD_URL}</a></p>
      <p>Please bookmark this link for future admin/instructor login.</p>
      <p>Thank you,<br>Dunamis Team</p>
    `;

};

module.exports = sendPasswordTemplate;
