const mongoose = require('mongoose');
require('dotenv').config();
const uri = process.env.DB_URL;

async function dbConnect() {
    mongoose.connect(uri
        ).then(() => {
            console.log("Successfully connected to MongoDb");
        })
        .catch((error) => {
            console.log("MongoDB connection failed");
            console.log(error);
        })

}

module.exports = dbConnect; 