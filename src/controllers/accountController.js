const yumRunUsers = require('../models/yumUsersModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT_SECRET = "duibfsfuyws8722efyfvuy33762";
const nodemailer = require('nodemailer');
const randomstring = require('randomstring');
const { createNewUser } = require('../services');
const images = require('../models/imageModel');
const walletNotification = require('../models/notifications');
const UserWallet = require('../models/walletModel');
const userTransaction = require("../models/transactionNewModel");
const { signJWT, verifyJWT } = require('../utils/jwt.utils');
const { createSession } = require('../utils/session');
const { signUpWithGoogle, verifyGoogleToken } = require('./googleController');
const GOOGLE_CLIENT_ID = 'your-google-client-id';
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(GOOGLE_CLIENT_ID);


const register = async (req, res, next) => {
    const {fullName, email, password} = req.body;
    console.log('Reached registration route handler');
  try {
    
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
if (!emailRegex.test(email)) {
  return res.status(400).json({error: "Invalid Email!"});
}
      const oldUser = await yumRunUsers.findOne({ email });
      if(oldUser){
        return res.status(400).json({error: "Email is already being used."});
      } 
      

      const encryptedPassword = await bcrypt.hash(password, 10);
      const otp = randomstring.generate({
        length: 4,
        charset: 'numeric'
      });
      const expirationTime = Date.now() + 5 * 60 * 1000;
      const message = `Hello ${fullName},\n\nYour OTP for verification is: ${otp}`;
      const transporter = nodemailer.createTransport({
        service: process.env.SMPT_SERVICE,
        auth: {
          user: process.env.SMPT_MAIL,
          pass: process.env.SMPT_PASSWORD,
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      
      const mailOptions = {
        from: process.env.APP_EMAIL,
        to: email,
        subject: 'yumRun OTP Code',
        text: message,
      };
      
      transporter.sendMail(mailOptions, async function(error, info){
        if (error) {
          console.log(error);
          if (error.responseCode === 553) {
            return res.json({ message: 'Invalid Email Address!' });
          } else {
         return res.json({ error: error, message: 'Failed to send OTP' });
          }
        } else {
          console.log('Email sent: ' + info.response);
          const transactionPin = 1111;
        const details =  {fullName, email, password: encryptedPassword, otp, expirationTime, otpVerified: false, userImage: '', };
        const createUser = await createNewUser(details);

          return res.json({ status: "ok", message: 'Registration Successful. Check email for OTP' });
        }
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({ error: "Internal Server Error"});
    }
}

const login = async (req, res, next) => {
  console.log("testing", req.user);
  try {
    const { email, password } = req.body;
    const user = await yumRunUsers.findOne({ email });

    if (!user) {
      return res.status(400).json({ error: "User does not exist" });
    }

     // Check if the user has signed up with Google OAuth
     if (user.provider === 'google') {
      return res.status(400).json({ error: 'Kindly use "Sign In with Google" to log in.' });
    }

    if (user.otpVerified !== true) {
      return res.status(400).json({ error: "Please verify OTP first" });
    }
    const fullName = user.fullName;
    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ status: "failed", error: "Incorrect Password" });
    }

    const session = createSession(email, fullName);
    const accessToken = signJWT({ email: user.email, _id: user._id, fullName, sessionId: session.sessionId  }, "7h");
    const refreshToken = signJWT({ sessionId: session.sessionId }, "1y");

    res.cookie('accessToken', accessToken, {
      maxAge: 25200000,
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });

    res.cookie('refreshToken', refreshToken, {
      maxAge: 31536000000, // 1 year (in milliseconds)
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });

    const { payload: decodedUser, expired } = verifyJWT(accessToken);
if (decodedUser) {
  const userdata = {_id: decodedUser._id, email, fullName};
  console.log("users", userdata);
  return res.status(201).json({
    status: "ok",
    message: "Login Successful",
    session,
  });
} else {
  console.error("Error decoding access token:", expired ? "Token expired" : "Token invalid");
  return res.status(500).json({ error: "Internal Server Error", });
}

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
};

const register_google = async (req, res) => {
  const redirectUrl = 'http://yumRun.onrender.com/auth/register-google-callback'; // Replace with your actual callback URL
  const authUrl = client.generateAuthUrl({
    scope: ['email', 'profile'],
    redirect_uri: redirectUrl,
  });
  console.log(authUrl);
  return res.status(201).json({
    status: "ok",
    authUrl,
  }); // now the frontend redirects the user to the authUrl
}

const register_google_callback = async (req, res, next) => {
  const { code } = req.query;

  try {
    // Exchange the authorization code for an access token and ID token
    const { tokens } = await client.getToken({
      code,
      redirect_uri: 'http://yumRun.onrender.com/auth/register-google-callback', // Set this to your actual redirect URI
    });

    // Extract the ID token from the response
    const googleToken = tokens.id_token;

    // Verify Google token using the separate function
    const googlePayload = await verifyGoogleToken(googleToken);

    if (googlePayload) {
      // Sign up the user with Google OAuth
      const newUser = await signUpWithGoogle(googlePayload);

      // Return user details or an authentication token to the client
      return res.json({ user: newUser });
    } else {
      // Google token verification failed
      return res.status(400).json({ error: 'Invalid Google token.' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

const google_login = async (req, res, next) => {
  const redirectUrl = 'http://yumRun.onrender.com/auth/google-callback'; // Replace with your actual callback URL
  const authUrl = client.generateAuthUrl({
    scope: ['email', 'profile'],
    redirect_uri: redirectUrl,
  });
  console.log(authUrl);
  return res.status(201).json({
    status: "ok",
    authUrl,
  }); // now the frontend redirects the user to the authUrl
}

const google_login_callback = async (req, res, next) => {
  const { code } = req.query;

  try {
    // Exchange the authorization code for an access token and ID token
    const { tokens } = await client.getToken({
      code,
      redirect_uri: 'http://yumRun.onrender.com/auth/login-google-callback', // Replace with your actual callback URL
    });

    // Extract the ID token from the response
    const googleToken = tokens.id_token;

    // Verify Google token using the separate function
    const googlePayload = await verifyGoogleToken(googleToken);
    console.log(googlePayload);
    if (googlePayload) {

      const existingUser = await yumRunUsers.findOne({ email: googlePayload.email });

      if (existingUser) {
        const session = createSession(existingUser.email, existingUser.fullName);
    const accessToken = signJWT({ email: existingUser.email, _id: existingUser._id, fullName: existingUser.fullName, sessionId: session.sessionId  }, "7h");
    const refreshToken = signJWT({ sessionId: session.sessionId }, "1y");

    res.cookie('accessToken', accessToken, {
      maxAge: 25200000,
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });

    res.cookie('refreshToken', refreshToken, {
      maxAge: 31536000000, // 1 year (in milliseconds)
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });

    const { payload: decodedUser, expired } = verifyJWT(accessToken);
if (decodedUser) {
  const userdata = {_id: decodedUser._id, email, fullName};
  console.log("users", userdata);
  return res.status(201).json({
    status: "ok",
    message: "Login Successful",
    session,
  });}
      } else {
        return res.status(404).json({ error: 'User not found. Please sign up.' });
      }
    } else {
      return res.status(400).json({ error: 'Invalid Google token.' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

const logout = async (req, res, next) => {
  try {
    res.cookie("accessToken", "", {
      maxAge: 0,
      httpOnly: true,
    });

    res.cookie("refreshToken", "", {
      maxAge: 0,
      httpOnly: true,
    });

    return res.status(200).json({
      status: 'success',
      message: 'User logged out',
      data: null,
    });
  } catch (error) {
    
    console.error('Logout error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal Server Error',
      data: null,
    });
  }
};

const delete_account = async (req, res, next) => {
  try {
    const userId  = req.user._id;

    const user = await yumRunUsers.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.cookie("accessToken", "", {
      maxAge: 0,
      httpOnly: true,
    });

    res.cookie("refreshToken", "", {
      maxAge: 0,
      httpOnly: true,
    });

     const deleteWallets = await UserWallet.deleteMany({ userId });

     const deleteNotifications = await walletNotification.deleteMany({ userId });
 
     const deleteTransactions = await userTransaction.deleteMany({ userId });
 
    const deleteUserAccount = await yumRunUsers.findByIdAndDelete(userId);
    console.log("Deleted User Account:", deleteUserAccount ? deleteUserAccount.toJSON() : null);

    return res.status(200).json({ message: 'User deleted successfully', deleteUserAccount });
  } catch (error) {
   console.error(error);
   return res.status(500).json({ error: 'Internal Server Error' });
  }
};



const user_data_dashboard = async (req, res, next) => {
  try {
    const { id } = req.body;
    const user = await yumRunUsers.findOne({ _id: id });

    if (!user) {
      return res.status(404).json({ status: "User does not exist!!" });
    }

    res.status(200).json({ status: "ok", walletdata: user });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ error: "Internal Server Error" });
  }
};
const user_dashboard = async (req, res, next) => {
  const { token } = req.body;
  if(!token) {
    return res.status(400).json({error: "Token is needed to get all user data."});
  }
  try {
    const user = jwt.verify(token, JWT_SECRET);
    const userid = user.id;
    bankUsers.findOne({ _id: userid}).then((data) => {
      res.send({ status: "ok", myuserdata: data});
    }).catch((error) => {
      res.send({ status: "error", data: error});
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ error: "Internal Server Error" });
  }
}

const verify_otp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const user = await yumRunUsers.findOne({ email });
    if (!user) {
      return res.json({ status: "User does not exist!!" });
    }
    if (user.otp !== otp) {
      return res.status(401).json({ message: "Invalid OTP" });
    }
    if (user.expirationTime < Date.now()) {
      return res.status(401).json({ message: "OTP has expired" });
    }

    user.otpVerified = true;
    await user.save();
    res.status(200).json({ message: "OTP Verification Complete", myuserinfo: user });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ error: "Internal Server Error" });
  }
}

const generate_otp = async (req, res, next) => {
  try {
    const { email } = req.body;
    const myuser = await yumRunUsers.findOne({ email });
    // Logic to generate OTP
    const otp = randomstring.generate({
      length: 4,
      charset: 'numeric'
    });
    const message = `Hello ${myuser.firstName} ${myuser.lastName},\n\nYour new OTP code is: ${otp}`;
    const transporter = nodemailer.createTransport({
      service: process.env.SMPT_SERVICE,
      auth: {
        user: process.env.SMPT_MAIL,
        pass: process.env.SMPT_PASSWORD,
      },
    });
    
    const mailOptions = {
      from: process.env.APP_EMAIL,
      to: email,
      subject: 'Bank App Wallet New OTP Code',
      text: message,
    };
    
    transporter.sendMail(mailOptions, async function(error, info){
      if (error) {
        console.log(error);
        res.status(500).json({ message: 'Failed to send OTP' });
      } else {
        console.log('Email sent: ' + info.response);
        myuser.otp = otp;
        await myuser.save();
        res.status(200).json({ message: 'New OTP sent successfully' });
      }
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ error: 'Internal Server Error' });
  }
}

const forgot_pass = async (req, res) => {
  const {email} = req.body;
     try {
      const oldUser = await yumRunUsers.findOne({ email });
      if(!oldUser){
        return res.status(400).json({ error: "User does not exist!!"});
      }
      const Useremail = oldUser.email;
      const secret = JWT_SECRET + oldUser.password;
      const token = jwt.sign({ email: oldUser.email, id: oldUser._id },secret,{
        expiresIn: "5m",
      });
      const link = `https://wallet-wb.vercel.app/reset-password/${oldUser._id}/${token}`;
      const message = `Reset your Passoword using the following link :- \n\n ${link} \n\nif you have not requested this email then, please ignore it. \n\n This link expires in 5 minutes. You must request a new link if that time elapses.`;
   
      const transporter = nodemailer.createTransport({
        service: process.env.SMPT_SERVICE,
        auth: {
          user: process.env.SMPT_MAIL,
          pass: process.env.SMPT_PASSWORD,
        },
      });
      
      const mailOptions = {
        from: process.env.APP_EMAIL,
        to: Useremail,
        subject: 'Bank App Wallet Password Reset',
        text: message,
      };
      
      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
          return res.status(400).json({ error: "error", message: "There is an issue sending password reset link"});
        } else {
          console.log('Email sent: ' + info.response);
          return res.status(200).json({ status: "ok", message: "Password Reset Link Sent Check Your Email!"});
        }
      });
     } catch (error) {
      console.log(error)
      return res.status(400).json({ error: "error", message: "Internal Serval Error"});
     }
}

const pass_reset = async (req, res) => {
    const {password, id, token} = req.body;
  //  const token = req.params.token;
    const oldUser = await yumRunUsers.findOne({ _id: id }); 
      if(!oldUser){
      return res.json({ status: "User does not exist!!"});
      }
      const secret = JWT_SECRET + oldUser.password;
      try {
        const verify = jwt.verify(token, secret);
        const encryptedPassword = await bcrypt.hash(password, 10);
        await yumRunUsers.updateOne({
          _id: id,
        }, {
          $set: {
            password: encryptedPassword,
          },
        });
        res.json({ status: "Password Updated"});
      } catch (error) {
        console.log(error);
        res.status(400).json({status: "Error: Your password could not be changed."});
      }
}

const userImage = async (req, res) => {
   const {userId} = req.params;
   const {myuserimage} = req.body;
   try {
     // Find the user by userId
     const user = await yumRunUsers.findById(userId);
     console.log(user);
 
     if (!user) {
       return res.status(404).json({ error: 'User not found.' });
     }
 
   const image =  await images.create({
      image: myuserimage,
      userId,
    });

    user.userImage = myuserimage;
    await user.save();

    res.send({ status: "ok", message: "Image upload successful"});
   } catch (error) {
    console.log(error);
    res.send({ status: "error", data: error});
   }
}

module.exports = {
    register,
    login,
    verify_otp,
    generate_otp,
    forgot_pass,
    pass_reset,
    user_dashboard,
    userImage,
    user_data_dashboard,
    logout,
    delete_account,
    register_google_callback,
    register_google,
    google_login,
    google_login_callback
} 