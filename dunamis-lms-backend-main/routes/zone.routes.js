const express = require('express');
const router = express.Router();
const { isAuth, accessToRole } = require("../middleware/auth");
const { getZone, CreateZone, updateZone, deleteZone } = require('../controller/zone.controller');
const { publicCache } = require("../middleware/cacheControl");

router.get('/get-all', publicCache(), getZone);
router.post('/create', isAuth, accessToRole(["admin", "superadmin"]), CreateZone);
router.put('/updatezone/:id', isAuth, accessToRole(["admin", "superadmin"]), updateZone);
router.delete('/delete/:id', isAuth, accessToRole(["admin", "superadmin"]), deleteZone);

module.exports = router;
