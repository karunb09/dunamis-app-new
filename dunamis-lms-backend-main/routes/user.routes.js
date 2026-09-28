const express= require("express");
const router= express.Router();
const{
    login,
    logout,
    getCurrentUser,
    changePassword,
    updateUser,
    getUserById,
    getUserDashboardNotices,
    markAllDashboardNoticesRead,
    markDashboardNoticeRead,
    clearDashboardNotices,
    deleteDashboardNotice,
    forgotPassword,
    verifyOTP,
    resetPassword,
    setEmployeeId

} = require("../controller/user.controller")
const { setOrgPlacement } = require("../controller/org.controller");
const { isAuth, accessToRole } = require("../middleware/auth");
const { targetUserPermission } = require("../middleware/staffScope");
const validate = require("../middleware/validate");
const { idParam } = require("../validators/common");
const {
  loginSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema,
} = require("../validators/auth.validator");

// router.post("/signUp",signUp);
router.post("/login", validate(loginSchema), login);
router.post("/logout", isAuth, logout);
router.get("/me", isAuth, getCurrentUser);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/verify-otp", validate(verifyOtpSchema), verifyOTP);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);
router.post("/change-password",isAuth, changePassword);
router.get("/notices", isAuth, getUserDashboardNotices);
router.patch("/notices/read-all", isAuth, markAllDashboardNoticesRead);
router.patch("/notices/:noticeId/read", isAuth, markDashboardNoticeRead);
router.delete("/notices", isAuth, clearDashboardNotices);
router.delete("/notices/:noticeId", isAuth, deleteDashboardNotice);
router.patch("/:id/employee-id", isAuth, accessToRole(["admin", "superadmin"]), targetUserPermission(), setEmployeeId);
router.patch("/:id/org", isAuth, accessToRole(["admin", "superadmin"]), validate(idParam, "params"), targetUserPermission(), setOrgPlacement);
router.get("/:id", isAuth, targetUserPermission(), getUserById)
router.put("/:id", isAuth, targetUserPermission(), updateUser);

module.exports = router;
