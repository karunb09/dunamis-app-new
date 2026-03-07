const jwt = require("jsonwebtoken");

exports.isAuth = async (req, res, next) => {
  try {
    const token =
      req.cookies?.token ||
      req.body?.token ||
      req.headers.authorization?.replace(/^\s*\w+\s+/, "").trim() ||
      req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.exp * 1000 < Date.now()) {
      res.clearCookie("token");
      return res.status(401).json({
        success: false,
        message: "Access token has expired",
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

exports.accessToRole = (roles = []) => {
  return async (req, res, next) => {
    if (!req.user || !roles.includes(req.user.accountType)) {
      return res.status(403).json({
        success: false,
        error: `Access denied, Only user with ${roles.join(" or ")} role is allowed`,
      });
    }
    next();
  };
};
