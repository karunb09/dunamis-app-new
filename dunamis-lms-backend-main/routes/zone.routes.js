const express = require('express');
const router = express.Router();
const {getZone, CreateZone, updateZone, deleteZone} = require('../controller/zone.controller')


router.get('/get-all',getZone);
router.post('/create',CreateZone);
router.put('/updatezone/:id',updateZone);
router.delete('/delete/:id',deleteZone);
 


module.exports = router;