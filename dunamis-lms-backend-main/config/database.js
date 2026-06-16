const mongoose = require("mongoose");
require("dotenv").config();

exports.connect =()=>{
    mongoose.connect(process.env.MONGODB_URL,{
      // Connection pool + timeouts (were unset -> driver defaults). Tuned for a
      // single-VPS deployment; override the pool size via MONGO_MAX_POOL.
      maxPoolSize: Number(process.env.MONGO_MAX_POOL) || 10,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    })
    .then(()=>{
        console.log("DB connected successfully".bgGreen.black)
    } )
.catch((error)=>{
    console.log("DB Connection failed".bgRed);
    console.error(error);
    process.exit(1);
})
};
