
const yumRunUsers = require('../models/yumUsersModel');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const signUpWithGoogle = async (googlePayload) => {
  try {
    // Extract relevant information from the Google payload
    const { email, name: fullName, picture: userImage } = googlePayload;

    // Check if the user already exists in the database
    const existingUser = await yumRunUsers.findOne({ email });

    if (existingUser) {
        return res.status(400).json({error: "Email is used."});
    }

    // User does not exist, create a new user record
    const newUser = await yumRunUsers.create({
      fullName,
      email,
      otpVerified: true, // Assuming Google OAuth sign-up is verified
      userImage,
      role: 'User',
      provider: 'google', // Indicate the registration source
    });

    return res.json({ status: "ok", message: 'Registration successful', newUser });
  } catch (error) {
    console.error('Error signing up with Google:', error);
    return res.status(400).json({error: "Error signing up with Google!"});
  }
};

const verifyGoogleToken = async (token) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    return payload;
  } catch (error) {
    console.error('Error verifying Google token:', error);
    return null;
  }
};


module.exports = {
  signUpWithGoogle,
  verifyGoogleToken
};
