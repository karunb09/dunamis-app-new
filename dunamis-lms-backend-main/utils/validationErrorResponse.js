const formatPath = (path = "") =>
  String(path)
    .replace(/\.(\d+)\./g, " #$1 ")
    .replace(/\.(\d+)$/g, " #$1")
    .replace(/\./g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());

const formatValidationError = (error) => {
  if (error?.name === "ValidationError") {
    const errors = Object.values(error.errors || {}).map((fieldError) => ({
      field: fieldError.path,
      message:
        fieldError.kind === "required"
          ? `${formatPath(fieldError.path)} is required.`
          : fieldError.message,
    }));

    return {
      statusCode: 400,
      body: {
        success: false,
        message: errors[0]?.message || "Validation failed.",
        errors,
      },
    };
  }

  if (error?.name === "CastError") {
    return {
      statusCode: 400,
      body: {
        success: false,
        message: `${formatPath(error.path)} has an invalid value.`,
        errors: [
          {
            field: error.path,
            message: `${formatPath(error.path)} has an invalid value.`,
          },
        ],
      },
    };
  }

  if (error?.code === 11000) {
    const field = Object.keys(error.keyPattern || error.keyValue || {})[0] || "field";

    return {
      statusCode: 409,
      body: {
        success: false,
        message: `${formatPath(field)} already exists.`,
        errors: [
          {
            field,
            message: `${formatPath(field)} already exists.`,
          },
        ],
      },
    };
  }

  return null;
};

const sendValidationError = (res, error, fallbackMessage = "Server error") => {
  const formatted = formatValidationError(error);

  if (formatted) {
    return res.status(formatted.statusCode).json(formatted.body);
  }

  return res.status(500).json({
    success: false,
    message: fallbackMessage,
    error: error?.message,
  });
};

module.exports = { formatValidationError, sendValidationError };
