const bankUsers = require("../models/yumUsersModel");
const myImages = require('../models/imageModel');
const { cloudinary } = require('../utils/cloudinary');
const fs = require('fs');
const path = require('path');

const userImage = async (req, res) => {
  console.log("testing", req.user);
  const  userId  = req.user._id;
  const { base64 } = req.body;

  try {
    // Find the user by userId
    const user = await bankUsers.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const userImageGallery = await myImages.find({ userId });

    if (!base64) {
      return res.status(400).json({ error: 'Missing required parameter - file' });
    }

    // Convert base64 image data to a buffer
    const imageBuffer = Buffer.from(base64, 'base64');

    // Create the temp directory if it doesn't exist
    const tempDirPath = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDirPath)) {
      fs.mkdirSync(tempDirPath);
    }

    // Create a temporary file path for the image
    const tempImagePath = path.join(tempDirPath, `${userId}-temp-image.jpg`);

    // Write the buffer to the temporary file
    fs.writeFileSync(tempImagePath, imageBuffer);

    // Upload image to cloudinary
    cloudinary.uploader.upload(tempImagePath, async (error, result) => {
      // Delete the temporary file
      fs.unlinkSync(tempImagePath);

      if (error) {
        console.log(error);
        return res.send({ status: 'error', data: error });
      }

      try {
        const image = await myImages.create({
          userImage: result.secure_url,
          userId,
          cloudinary_id: result.public_id,
        });

        user.userImage = result.secure_url;
        await user.save();

        res.send({ status: 'ok', message: 'Image upload successful', data: image, images: userImageGallery});
      } catch (error) {
        console.log(error);
        res.send({ status: 'error', data: error });
      } 
    });
  } catch (error) {
    console.log(error);
    res.send({ status: 'error', data: error });
  }
};

const userData = async (req, res) => {
  const userId = req.user._id;
  try {
    const userData = await bankUsers.findOne({ _id: userId });

    if (!userData) {
      return res.status(404).json({ error: "User does not exist!!" });
    }
    res.send({ message: 'Your Data', userData});
  } catch (error) {
    console.log(error);
  }
}


 module.exports = {
    userImage,
    userData
 }

 