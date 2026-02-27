const express= require("express");
const router= express.Router();
const{
    login,
    changePassword,
    updateUser,
    getAllUsers,
    getUserById,
    getUserDashboardNotices,
    forgotPassword,
    verifyOTP,
    resetPassword

} = require("../controller/user.controller")
const { isAuth } = require("../middleware/auth");

// router.post("/signUp",signUp);
router.post("/login",login);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOTP);
router.post("/reset-password", resetPassword);
router.post("/change-password",isAuth, changePassword);
// router.get("/get-all", isAuth, getAllUsers)
router.get("/get-all", getAllUsers);
router.get("/notices", isAuth, getUserDashboardNotices);
router.get("/:id", getUserById)
router.put("/:id", isAuth, updateUser);

module.exports = router;