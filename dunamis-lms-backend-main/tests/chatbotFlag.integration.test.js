"use strict";

// The chat assistant's feature flag: off unless CHATBOT_ENABLED=true. The
// website reads /status to decide whether to show the widget, and the chat
// endpoints refuse while it is off.
//
// Run with:  npm run test:integration

const { test, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-at-least-32-chars-long-xx";

const chatbotRoutes = require("../routes/chatbot.routes");

function request(method, path, body) {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/chatbot", chatbotRoutes);
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const data = body ? JSON.stringify(body) : "";
      const headers = { "content-type": "application/json", "content-length": Buffer.byteLength(data) };
      const req = http.request({ port: server.address().port, path, method, headers }, (res) => {
        let text = "";
        res.on("data", (chunk) => (text += chunk));
        res.on("end", () => {
          server.close();
          resolve({ status: res.statusCode, body: text ? JSON.parse(text) : null });
        });
      });
      req.on("error", (error) => {
        server.close();
        reject(error);
      });
      if (data) req.write(data);
      req.end();
    });
  });
}

const original = process.env.CHATBOT_ENABLED;
afterEach(() => {
  if (original === undefined) delete process.env.CHATBOT_ENABLED;
  else process.env.CHATBOT_ENABLED = original;
});

test("the assistant is off unless CHATBOT_ENABLED is true", async () => {
  delete process.env.CHATBOT_ENABLED;

  const status = await request("GET", "/api/v1/chatbot/status");
  const message = await request("POST", "/api/v1/chatbot/message", { text: "hi" });
  const feedback = await request("POST", "/api/v1/chatbot/feedback", {});
  const student = await request("POST", "/api/v1/chatbot/student/message", { text: "hi" });

  assert.equal(status.status, 200);
  assert.equal(status.body.enabled, false);
  assert.equal(message.status, 404);
  assert.equal(feedback.status, 404);
  assert.equal(student.status, 404, "refused before the login check");
});

test("CHATBOT_ENABLED=true turns it on", async () => {
  process.env.CHATBOT_ENABLED = "true";

  const status = await request("GET", "/api/v1/chatbot/status");
  const student = await request("POST", "/api/v1/chatbot/student/message", { text: "hi" });

  assert.equal(status.body.enabled, true);
  assert.equal(student.status, 401, "past the flag, the usual login check applies");
});
