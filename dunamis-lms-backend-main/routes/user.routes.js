const express= require("express");
const router= express.Router();
const{
    login,
    logout,
    changePassword,
    updateUser,
    getAllUsers,
    getUserById,
    getUserDashboardNotices,
    forgotPassword,
    verifyOTP,
    resetPassword

} = require("../controller/user.controller")
const { isAuth, accessToRole } = require("../middleware/auth");

// router.post("/signUp",signUp);
router.post("/login",login);
router.post("/logout", isAuth, logout);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOTP);
router.post("/reset-password", resetPassword);
router.post("/change-password",isAuth, changePassword);
router.get("/get-all", isAuth, accessToRole(["admin", "superadmin"]), getAllUsers);
router.get("/notices", isAuth, getUserDashboardNotices);
router.get("/:id", isAuth, getUserById)
router.put("/:id", isAuth, updateUser);

module.exports = router;
