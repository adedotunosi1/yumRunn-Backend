const mongoose = require('mongoose');

const yumUsersSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, "Full Name is required"]
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
  },
  password: {
    type: String,
    required: function () {
      // Make password required only for normal sign-ups
      return this.provider === 'local';
    }
  },
  otp: {
    type: String,
    required: function () {
      // Make OTP required only for normal sign-ups
      return this.provider === 'local';
    }
  },
  expirationTime: {
    type: String,
    required: function () {
      // Make expirationTime required only for normal sign-ups
      return this.provider === 'local';
    }
  },
  otpVerified: {
    type: Boolean,
    required: [true, "OTP verification status is required"],
  },
  userImage: {
    type: String,
    required: false,
  },
  role: {
    type: String,
    default: "User",
    required: true,
  },
  provider: {
    type: String,
    enum: ['local', 'google'], // Add other providers as needed
    default: 'local',
    required: true,
  }
});

const yumRunUsers = mongoose.model('yumRunUsers', yumUsersSchema);
module.exports = yumRunUsers;
