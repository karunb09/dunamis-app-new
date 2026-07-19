const zone = require("../model/zone.model");
const { sendValidationError } = require("../utils/validationErrorResponse");

//get zone
const getZone = async(req,res) => {
    try{
        const zones = await zone.find();

        if(!zone || zone.length === 0){
            res.json({
                messege: "There is no zone"
            })
        }
        // if we have zone >=1
        res.status(200).json({
           success: true,
           zone: zones
        })
    }
    catch(error){
        res.status(500).json({
            success:false,
            message:"error"
        })
    }
}
// Create Zone
const CreateZone = async (req,res) => {
    try{
        const{name, location, manager, adminContact, adminEmail, city} = req.body;
        if (!name || !location || !manager || !adminContact || !adminEmail || !city) {
            return res.status(400).json({
                success: false,
                message: "All required fields must be filled.",
            });
        }

        const newZone = new zone ({name, location, manager, adminContact, adminEmail, city});
        await newZone.save();
        res.status(200).json({
            success: true,
            Zone: newZone
        })
    }
    catch(error){
        sendValidationError(res, error, "Failed to create zone");

    }
}
// Update zone 
const updateZone = async (req,res) => {
    try{
        console.log("put req")
        const {id} = req.params;
        const{name, location, manager, adminContact, adminEmail, city} = req.body;

        const updatedZone = await zone.findByIdAndUpdate(
            id,
            {name, location, manager, adminContact, adminEmail, city},
            {returnDocument: "after", runValidators: true}
        );

        if(!updatedZone) {
            return res.status(404).json({
                success: false,
                message:"Zone not found"
            })
        }
        res.status(200).json({
            success: true,
            zone: updatedZone
        })
    }
    catch(error){
        sendValidationError(res, error, "Failed to update zone");
    } 
}
// Delete Zone
const deleteZone = async (req,res) =>{
    try{
        const{id} = req.params;
        const Deletedzone = await zone.findByIdAndDelete(id);

        if(!Deletedzone){
            res.json({
                message: "zone not found"
            })
        }

        res.status(200).json({
            messege: "zone Deleted Successfully",
            zone: Deletedzone
        })

    }
    catch(error){
        res.status(500).json({
            success: false,
            message: "error"
        })
    } 
}
module.exports = {getZone, CreateZone, updateZone, deleteZone}
