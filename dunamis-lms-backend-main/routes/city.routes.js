const express = require("express");
const router = express.Router();

const { isAuth, accessToRole, requirePermission } = require("../middleware/auth");
const { publicCache } = require("../middleware/cacheControl");
const {
  createCity,
  getAllCities,
  updateCity,
  deleteCity,
  getCityById,
} = require("../controller/city.controller");

router.get("/get-all-cities", publicCache(), getAllCities);
router.get("/:id", getCityById);
const adminOnly = [isAuth, accessToRole(["admin", "superadmin"]), requirePermission("offlineCenters")];

router.post("/create", ...adminOnly, createCity);
router.put("/:id", ...adminOnly, updateCity);
router.delete("/:id", ...adminOnly, deleteCity);

module.exports = router;
