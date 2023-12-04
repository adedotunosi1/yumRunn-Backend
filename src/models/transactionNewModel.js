const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "users",
    },
    walletType: {
      type: String,
      required: true,
      enum: ["naira", "usd"],
    },
    amount: {
      type: Number,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    paymentStatus: {
        type: String,
        enum: ["successful", "pending", "failed"],
        default: "pending",
      },
    transactionType: {
        type: String,
        required: true,
        enum: ["Deposit", "Withdrawal", "Virtual Card"],
        default: "funding",
      },
      paymentGateway: {
        type: String,
        required: [true, "payment gateway is required"],
        enum: ["Paystack", "Flutterwave", "Stripe", "Demo"], 
      },
  });

  const mainTransactions = mongoose.model('yumRunUserTransactions', transactionSchema);
  module.exports = mainTransactions;