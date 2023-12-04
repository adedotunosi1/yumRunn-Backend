const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    userId: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true},
    isRead: { type: Boolean, default: false},
    createdAt: {type: Date, default: Date.now },
});

const walletNotification = mongoose.model("UserNotifications", notificationSchema);
module.exports = walletNotification;