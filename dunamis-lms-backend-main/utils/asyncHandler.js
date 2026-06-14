/**
 * Wraps an async route handler so any thrown error / rejected promise is
 * forwarded to Express's central error-handling middleware instead of being
 * swallowed or requiring a per-handler try/catch.
 *
 * Usage:  router.post("/", asyncHandler(controllerFn))
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
