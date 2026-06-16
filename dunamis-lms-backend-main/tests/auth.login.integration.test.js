"use strict";

// Integration tests for the real login controller against an in-memory MongoDB.
// Auth is a critical, previously-untested flow. No email/Cashfree calls are made
// by login, so this runs fully offline once the mongod binary is cached.
//
// Run with:  npm run test:integration   (or npm run test:all)

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");
const express = require("express");

// Deterministic secret + TTL for the run (controller reads JWT_SECRET at call
// time; config/auth reads the TTL at load time).
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-at-least-32-chars-long-xx";
process.env.JWT_ACCESS_TTL_MINUTES = process.env.JWT_ACCESS_TTL_MINUTES || "15";

const { startMemoryMongo, stopMemoryMongo, clearCollections } = require("./helpers/db");

// Register models the login flow populates (admin/teacher/student virtuals),
// or Mongoose throws MissingSchemaError on populate.
require("../model/admin.model");
require("../model/student.model");
require("../model/teacher.model");
const User = require("../model/user.model");

const validate = require("../middleware/validate");
const { loginSchema } = require("../validators/auth.validator");
const { login } = require("../controller/user.controller");

function buildApp() {
  const app = express();
  app.use(express.json());
  app.post("/api/v1/user/login", validate(loginSchema), login);
  return app;
}

function postJson(app, path, body) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const port = server.address().port;
      const data = JSON.stringify(body);
      const req = http.request(
        {
          port,
          path,
          method: "POST",
          headers: { "content-type": "application/json", "content-length": Buffer.byteLength(data) },
        },
        (res) => {
          let d = "";
          res.on("data", (c) => (d += c));
          res.on("end", () => {
            server.close();
            resolve({ status: res.statusCode, headers: res.headers, body: d ? JSON.parse(d) : null });
          });
        }
      );
      req.on("error", (e) => { server.close(); reject(e); });
      req.write(data);
      req.end();
    });
  });
}

// Create a user; the model's pre-save hook hashes the plaintext password.
async function seedUser(overrides = {}) {
  return User.create({
    name: { firstName: "Test", lastName: "User" },
    email: "student@example.com",
    mobileNo: 9999999999,
    password: "secret123",
    accountType: "student",
    accountStatus: "active",
    ...overrides,
  });
}

let app;
before(async () => {
  await startMemoryMongo();
  app = buildApp();
});
after(async () => {
  await stopMemoryMongo();
});
beforeEach(async () => {
  await clearCollections();
});

test("valid credentials -> 200, verifiable JWT + auth cookie", async () => {
  await seedUser();
  const res = await postJson(app, "/api/v1/user/login", {
    email: "student@example.com",
    password: "secret123",
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.token, "token returned in body");

  // Token is signed with our secret and carries the right claims.
  const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
  assert.equal(decoded.email, "student@example.com");
  assert.equal(decoded.accountType, "student");
  // 15-minute TTL (900s) from config/auth.
  assert.equal(decoded.exp - decoded.iat, 900);

  // httpOnly auth cookie set.
  const setCookie = String(res.headers["set-cookie"] || "");
  assert.match(setCookie, /token=/);
  assert.match(setCookie, /HttpOnly/i);

  // Password never leaves the server.
  assert.equal(res.body.user.password, undefined);
});

test("wrong password -> 401", async () => {
  await seedUser();
  const res = await postJson(app, "/api/v1/user/login", {
    email: "student@example.com",
    password: "wrong-password",
  });
  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test("unknown email -> 401", async () => {
  const res = await postJson(app, "/api/v1/user/login", {
    email: "nobody@example.com",
    password: "secret123",
  });
  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test("inactive account -> 400 (cannot log in)", async () => {
  await seedUser({ accountStatus: "inactive" });
  const res = await postJson(app, "/api/v1/user/login", {
    email: "student@example.com",
    password: "secret123",
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test("malformed payload is rejected by validation (400) before the controller", async () => {
  const res = await postJson(app, "/api/v1/user/login", { email: "not-an-email" });
  assert.equal(res.status, 400);
  assert.ok(Array.isArray(res.body.errors));
});
