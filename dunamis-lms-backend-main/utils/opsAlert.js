const axios = require("axios");
const { sendEmails, getAdminUsers } = require("./notificationService");

const sendOpsAlert = async ({ title, message, html }) => {
  const tasks = [
    (async () => {
      const recipients = process.env.ALERT_EMAIL
        ? process.env.ALERT_EMAIL.split(",").map((e) => e.trim()).filter(Boolean)
        : (await getAdminUsers()).map((u) => u.email).filter(Boolean);
      if (!recipients.length) return;
      await sendEmails({
        recipients,
        subject: title,
        html: html || `<pre>${message}</pre>`,
      });
    })(),
  ];

  if (process.env.NTFY_TOPIC_URL) {
    tasks.push(
      axios.post(process.env.NTFY_TOPIC_URL, message, {
        headers: { Title: title, Priority: "high", Tags: "rotating_light" },
        timeout: 5000,
      })
    );
  }

  const results = await Promise.allSettled(tasks);
  results.forEach((r) => {
    if (r.status === "rejected") {
      console.error("[OpsAlert] Channel failed:", r.reason?.message);
    }
  });
};

module.exports = { sendOpsAlert };
