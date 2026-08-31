const path = require("path");

const DEFAULT_DASHBOARD_URL =
  process.env.DASHBOARD_URL || "https://dashboard.dunamisindia.co.in";
const LOGO_PATH = path.resolve(__dirname, "../Dunamis.png");
const LOGO_CID = "dunamis-logo";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const sendPasswordTemplate = (user, role, password) => {
    const { name, email } = user;
    const roleLabel = escapeHtml(role);

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
      <div style="padding:24px 28px;background:linear-gradient(135deg,#111827,#1f2937);color:#fff;">
        <div style="display:inline-block;background:#ffffff;border-radius:10px;padding:8px 14px;margin:0 0 12px;line-height:0;">
          <img src="cid:${LOGO_CID}" alt="Dunamis Logo" style="height:32px;width:auto;display:block;" />
        </div>
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#fdba74;">Dunamis LMS</p>
        <h1 style="margin:0;font-size:22px;line-height:1.3;">Your ${roleLabel} account is ready</h1>
      </div>
      <div style="padding:28px;">
        <p style="margin:0 0 18px;color:#334155;font-size:15px;line-height:1.7;">Hello ${escapeHtml(name.firstName)}, your <strong>${roleLabel}</strong> account has been successfully created in the LMS system. Here are your login credentials:</p>
        <div style="border:1px solid #e2e8f0;border-radius:14px;padding:18px 20px;background:#f8fafc;">
          <p style="margin:0 0 10px;color:#334155;"><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p style="margin:0;color:#334155;">
            <strong>Temporary password:</strong>
            <span style="display:inline-block;margin-left:6px;padding:3px 10px;background:#111827;color:#fff;border-radius:6px;font-family:'Courier New',monospace;font-size:14px;letter-spacing:0.05em;">${escapeHtml(password)}</span>
          </p>
        </div>
        <p style="margin:20px 0 0;color:#b45309;font-size:13px;line-height:1.6;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 16px;">
          For security, please log in and change this password immediately after your first login.
        </p>
        <div style="margin-top:24px;">
          <a href="${DEFAULT_DASHBOARD_URL}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:700;">Go to dashboard</a>
        </div>
        <p style="margin:24px 0 0;color:#64748b;font-size:12px;line-height:1.6;">Please bookmark this link for future admin/instructor login.</p>
        <p style="margin:16px 0 0;color:#64748b;font-size:13px;">Thank you,<br>Dunamis Team</p>
      </div>
    </div>
  </div>
</body>
</html>`;
};

sendPasswordTemplate.attachments = [
  { filename: "Dunamis.png", path: LOGO_PATH, cid: LOGO_CID },
];

module.exports = sendPasswordTemplate;
