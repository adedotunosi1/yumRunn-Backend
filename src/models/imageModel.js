const mongoose = require('mongoose');
const ImageSchema = new mongoose.Schema({
    userImage: {
        type: String, 
    },
    userId: {
        type: String,
        ref: "users",
        required: true,
    },
    cloudinary_id: {
        type: String,
    }
},
{timestamps: true }
)

const userProfileImage = mongoose.model('UserImages', ImageSchema);

module.exports = userProfileImage;