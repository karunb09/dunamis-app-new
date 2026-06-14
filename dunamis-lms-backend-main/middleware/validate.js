/**
 * Request validation middleware factory backed by zod.
 *
 * Validates a single request part (default: body) against a zod schema.
 * On success the parsed/coerced value replaces the original (for body) so
 * downstream controllers receive clean, typed data. On failure it returns a
 * structured 400 matching the existing app error shape:
 *   { success:false, message, errors:[{ field, message }] }
 *
 * Express 5 makes req.query / req.params read-only getters, so parsed values
 * for those parts are exposed on req.validated.<part> instead of reassigned.
 *
 * Usage:  router.post("/login", validate(loginSchema), login)
 *         router.get("/:id", validate(idSchema, "params"), getById)
 */
const validate = (schema, source = "body") => (req, res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join(".") || source,
      message: issue.message,
    }));

    return res.status(400).json({
      success: false,
      message: errors[0]?.message || "Validation failed.",
      errors,
    });
  }

  if (source === "body") {
    req.body = result.data;
  } else {
    req.validated = { ...(req.validated || {}), [source]: result.data };
  }

  next();
};

module.exports = validate;
