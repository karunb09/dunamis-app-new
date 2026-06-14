"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");

const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");
const { errorHandler, notFound } = require("../middleware/errorHandler");

const { loginSchema, resetPasswordSchema } = require("../validators/auth.validator");
const { createOrderSchema, verifyPaymentSchema } = require("../validators/enrollment.validator");
const { createSlotSchema } = require("../validators/slot.validator");
const { createEnquirySchema } = require("../validators/enquiry.validator");
const { bookDemoSchema } = require("../validators/demoBooking.validator");

const OID = "a".repeat(24);

// --- tiny express-style mock helpers ---
function mockRes() {
  return {
    statusCode: null,
    body: null,
    headersSent: false,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      this.headersSent = true;
      return this;
    },
  };
}

function runValidate(schema, body, source = "body") {
  const req = { [source]: body };
  const res = mockRes();
  let nextCalled = false;
  validate(schema, source)(req, res, () => {
    nextCalled = true;
  });
  return { req, res, nextCalled };
}

// ============================ schema validation ============================

test("login: missing fields -> 400 with field errors, structured shape", () => {
  const { res, nextCalled } = runValidate(loginSchema, {});
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.ok(Array.isArray(res.body.errors));
  const fields = res.body.errors.map((e) => e.field);
  assert.ok(fields.includes("email"));
  assert.ok(fields.includes("password"));
});

test("login: invalid email -> 400", () => {
  const { res } = runValidate(loginSchema, { email: "nope", password: "x" });
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /valid email/i);
});

test("login: valid -> next() and email normalized/trimmed", () => {
  const { req, res, nextCalled } = runValidate(loginSchema, {
    email: "  Foo@Bar.COM ",
    password: "secret",
  });
  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, null);
  assert.equal(req.body.email, "foo@bar.com");
});

test("resetPassword: short password -> 400 with the exact message", () => {
  const { res } = runValidate(resetPasswordSchema, {
    email: "a@b.com",
    otp: "1234",
    newPassword: "123",
  });
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /at least 6 characters/i);
});

test("createOrder: malformed ObjectId -> 400 (would otherwise 500)", () => {
  const { res } = runValidate(createOrderSchema, {
    courseId: "123",
    teacherId: OID,
    slotId: OID,
    sessionType: "standard",
  });
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /courseId/);
});

test("createOrder: valid keeps extra fields and coerces planMonths", () => {
  const { req, res, nextCalled } = runValidate(createOrderSchema, {
    courseId: OID,
    teacherId: OID,
    slotId: OID,
    sessionType: "standard",
    planMonths: "6",
    note: "passthrough",
  });
  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, null);
  assert.equal(req.body.planMonths, 6);
  assert.equal(typeof req.body.planMonths, "number");
  assert.equal(req.body.note, "passthrough");
});

test("verifyPayment: requires at least one order id", () => {
  assert.equal(runValidate(verifyPaymentSchema, {}).res.statusCode, 400);
  assert.equal(runValidate(verifyPaymentSchema, { order_id: "ORD1" }).nextCalled, true);
});

test("createSlot: bad enum -> 400", () => {
  const { res } = runValidate(createSlotSchema, {
    courseId: OID,
    date: "2026-06-10",
    startTime: "10:00",
    endTime: "11:00",
    slotType: "bogus",
    sessionType: "standard",
  });
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /slotType/);
});

test("enquiry: short message -> 400; valid -> next", () => {
  assert.equal(
    runValidate(createEnquirySchema, {
      name: "A",
      email: "a@b.com",
      subject: "Hello",
      message: "short",
    }).res.statusCode,
    400
  );
  assert.equal(
    runValidate(createEnquirySchema, {
      name: "A",
      email: "a@b.com",
      subject: "Hello",
      message: "this is long enough",
    }).nextCalled,
    true
  );
});

test("bookDemo: malformed slotId -> 400; valid passes lead through", () => {
  assert.equal(
    runValidate(bookDemoSchema, { courseId: OID, slotId: "bad" }).res.statusCode,
    400
  );
  const ok = runValidate(bookDemoSchema, {
    courseId: OID,
    slotId: OID,
    lead: { name: "Guest", phone: "999" },
  });
  assert.equal(ok.nextCalled, true);
  assert.equal(ok.req.body.lead.name, "Guest");
});

// ============================ error handler ============================

test("errorHandler: maps a ZodError to a 400", () => {
  const parsed = loginSchema.safeParse({});
  const res = mockRes();
  errorHandler(parsed.error, {}, res, () => {});
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.ok(res.body.errors.length > 0);
});

test("errorHandler: maps a Mongoose ValidationError to a 400", () => {
  const err = {
    name: "ValidationError",
    errors: { email: { path: "email", kind: "required", message: "Email required" } },
  };
  const res = mockRes();
  errorHandler(err, {}, res, () => {});
  assert.equal(res.statusCode, 400);
});

test("errorHandler: honours err.statusCode and hides stack in production", () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  const res = mockRes();
  const err = new Error("teapot");
  err.statusCode = 418;
  errorHandler(err, {}, res, () => {});
  assert.equal(res.statusCode, 418);
  assert.equal(res.body.message, "teapot");
  assert.equal(res.body.stack, undefined);
  process.env.NODE_ENV = prev;
});

test("notFound: returns a 404", () => {
  const res = mockRes();
  notFound({ method: "GET", originalUrl: "/nope" }, res, () => {});
  assert.equal(res.statusCode, 404);
  assert.equal(res.body.success, false);
});

// ============================ asyncHandler ============================

test("asyncHandler: forwards a rejected promise to next(err)", async () => {
  const boom = new Error("boom");
  let received = null;
  const handler = asyncHandler(async () => {
    throw boom;
  });
  await handler({}, {}, (e) => {
    received = e;
  });
  assert.equal(received, boom);
});

test("asyncHandler: does not call next on success", async () => {
  let nextCalls = 0;
  const handler = asyncHandler(async (req, res) => {
    res.ok = true;
  });
  const res = {};
  await handler({}, res, () => {
    nextCalls += 1;
  });
  assert.equal(nextCalls, 0);
  assert.equal(res.ok, true);
});
