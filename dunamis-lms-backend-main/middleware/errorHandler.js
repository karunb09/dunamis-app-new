/**
 * Central error-handling middleware. Mounted LAST in index.js.
 *
 * Catches anything forwarded via next(err) — including errors thrown from
 * handlers wrapped in asyncHandler — and converts known error types into a
 * consistent response shape: { success:false, message, errors? }.
 *
 * This is what lets new controllers drop their per-handler try/catch blocks.
 */
const { ZodError } = require("zod");
const { formatValidationError } = require("../utils/validationErrorResponse");

// 404 for unmatched routes — mount just before errorHandler.
const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

// eslint-disable-next-line no-unused-vars -- Express needs the 4-arg signature
const errorHandler = (err, req, res, next) => {
  // Already-sent responses must defer to Express's default handler.
  if (res.headersSent) {
    return next(err);
  }

  // zod validation errors (e.g. thrown by schema.parse in a handler).
  if (err instanceof ZodError) {
    const errors = err.issues.map((issue) => ({
      field: issue.path.join(".") || "body",
      message: issue.message,
    }));
    return res.status(400).json({
      success: false,
      message: errors[0]?.message || "Validation failed.",
      errors,
    });
  }

  // Mongoose ValidationError / CastError / duplicate-key (11000).
  const mongooseFormatted = formatValidationError(err);
  if (mongooseFormatted) {
    return res.status(mongooseFormatted.statusCode).json(mongooseFormatted.body);
  }

  // JWT failures.
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  const isProd = process.env.NODE_ENV === "production";

  if (statusCode >= 500) {
    console.error("[error]", err);
  }

  return res.status(statusCode).json({
    success: false,
    message: err.message || "Server error",
    ...(isProd ? {} : { stack: err.stack }),
  });
};

module.exports = { errorHandler, notFound };
