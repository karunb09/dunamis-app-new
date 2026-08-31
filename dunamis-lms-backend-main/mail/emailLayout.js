const fs = require("fs");
const path = require("path");

// The branded shell every transactional email shares: dark gradient header with
// the logo chip, a white card, an orange pill CTA, and a footnote.
const LOGO_PATH = path.resolve(__dirname, "../Dunamis.png");
const LOGO_CID = "dunamis-logo";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const brandAttachments = () => {
  if (!fs.existsSync(LOGO_PATH)) return [];
  return [{ filename: "Dunamis.png", path: LOGO_PATH, cid: LOGO_CID }];
};

const brandCard = ({ title, intro, details, ctaText, ctaHref, footnote }) => `
  <div style="max-width:640px;margin:0 auto;padding:24px;background:#f5f7fb;font-family:Arial,sans-serif;">
    <div style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
      <div style="padding:24px 28px;background:linear-gradient(135deg,#111827,#1f2937);color:#fff;">
        <div style="display:inline-block;background:#ffffff;border-radius:10px;padding:8px 14px;margin:0 0 12px;line-height:0;">
          <img src="cid:${LOGO_CID}" alt="Dunamis logo" style="height:32px;width:auto;display:block;" />
        </div>
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#fdba74;">Dunamis LMS</p>
        <h1 style="margin:0;font-size:24px;line-height:1.2;">${escapeHtml(title)}</h1>
      </div>
      <div style="padding:28px;">
        <p style="margin:0 0 18px;color:#334155;font-size:15px;line-height:1.7;">${escapeHtml(intro)}</p>
        <div style="border:1px solid #e2e8f0;border-radius:14px;padding:18px 20px;background:#f8fafc;">
          ${details}
        </div>
        <div style="margin-top:24px;">
          <a href="${escapeHtml(ctaHref)}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:700;">${escapeHtml(ctaText)}</a>
        </div>
        <p style="margin:24px 0 0;color:#64748b;font-size:12px;line-height:1.6;">${escapeHtml(footnote)}</p>
      </div>
    </div>
  </div>
`;

module.exports = { escapeHtml, brandCard, brandAttachments, LOGO_PATH, LOGO_CID };
