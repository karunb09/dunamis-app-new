const express = require('express');
const router = express.Router();
const {getZone, CreateZone, updateZone, deleteZone} = require('../controller/zone.controller')


const { isAuth, accessToRole } = require("../middleware/auth");
const adminOnly = [isAuth, accessToRole(["admin", "superadmin"])];
router.get('/get-all',getZone);
router.post('/create', ...adminOnly, CreateZone);
router.put('/updatezone/:id', ...adminOnly, updateZone);
router.delete('/delete/:id', ...adminOnly, deleteZone);
 


module.exports = router;