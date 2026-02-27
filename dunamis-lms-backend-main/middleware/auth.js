const jwt = require("jsonwebtoken");

exports.isAuth = async (req, res, next) => {
  try {
    const token =
      req.cookies?.token ||
      req.body?.token ||
      req.headers.authorization?.replace(/^\s*\w+\s+/, "").trim() ||
      req.headers.authorization?.split(" ")[1];

    console.log("Received Token:", token); // Debug token

    if (!token) {
      return res.status(401).json({ error: "Access denied. No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded Token:", decoded); // Debug decoded data

    if (decoded.exp * 1000 < Date.now()) {
      res.clearCookie("msToken");
      return res.status(401).json({ message: "Access token has expired" });
    }
    req.user = decoded;
    console.log("req.user:", req.user); // Debug req.user
    next();
  } catch (error) {
    console.error("JWT Error:", error.message); // Debug error
    next(error);
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