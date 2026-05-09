const express= require("express");
const router= express.Router();
const{
    login,
    logout,
    getCurrentUser,
    changePassword,
    updateUser,
    getAllUsers,
    getUserById,
    getUserDashboardNotices,
    markAllDashboardNoticesRead,
    markDashboardNoticeRead,
    clearDashboardNotices,
    deleteDashboardNotice,
    forgotPassword,
    verifyOTP,
    resetPassword

} = require("../controller/user.controller")
const { isAuth, accessToRole } = require("../middleware/auth");

// router.post("/signUp",signUp);
router.post("/login",login);
router.post("/logout", isAuth, logout);
router.get("/me", isAuth, getCurrentUser);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOTP);
router.post("/reset-password", resetPassword);
router.post("/change-password",isAuth, changePassword);
router.get("/get-all", isAuth, accessToRole(["admin", "superadmin"]), getAllUsers);
router.get("/notices", isAuth, getUserDashboardNotices);
router.patch("/notices/read-all", isAuth, markAllDashboardNoticesRead);
router.patch("/notices/:noticeId/read", isAuth, markDashboardNoticeRead);
router.delete("/notices", isAuth, clearDashboardNotices);
router.delete("/notices/:noticeId", isAuth, deleteDashboardNotice);
router.get("/:id", isAuth, getUserById)
router.put("/:id", isAuth, updateUser);

module.exports = router;
