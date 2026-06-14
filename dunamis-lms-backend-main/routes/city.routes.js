const express = require("express");
const router = express.Router();

const {
  createCity,
  getAllCities,
  getCityManagers,
  updateCity,
  deleteCity,
  getCityById,
} = require("../controller/city.controller");

// Create City
const { isAuth, accessToRole } = require("../middleware/auth");
const adminOnly = [isAuth, accessToRole(["admin", "superadmin"])];
router.post("/create", ...adminOnly, createCity);

// Get all cities
router.get("/get-all-cities", getAllCities);

// Get city managers
router.get("/managers", getCityManagers);

// Get city by ID
router.get("/:id", getCityById);

// Update city
router.put("/:id", ...adminOnly, updateCity);

// Delete city
router.delete("/:id", ...adminOnly, deleteCity);

module.exports = router;
