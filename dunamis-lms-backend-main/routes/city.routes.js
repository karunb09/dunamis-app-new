const express = require("express");
const router = express.Router();

const { isAuth, accessToRole } = require("../middleware/auth");
const {
  createCity,
  getAllCities,
  getCityManagers,
  updateCity,
  deleteCity,
  getCityById,
} = require("../controller/city.controller");

router.get("/get-all-cities", getAllCities);
router.get("/managers", getCityManagers);
router.get("/:id", getCityById);
router.post("/create", isAuth, accessToRole(["admin", "superadmin"]), createCity);
router.put("/:id", isAuth, accessToRole(["admin", "superadmin"]), updateCity);
router.delete("/:id", isAuth, accessToRole(["admin", "superadmin"]), deleteCity);

module.exports = router;
