const express = require('express');
const controllers = require('../controllers');
const { requireUser } = require('../middlewares/auth.middleware');

const walletRoute = express.Router();

walletRoute.post('/create', requireUser, controllers.WalletController.userWallet);
walletRoute.get('/balance', controllers.WalletController.walletBalance);
walletRoute.get('/transresponse', requireUser, controllers.WalletController.transactionResponse);
walletRoute.post('/fund', requireUser, controllers.WalletController.fund_wallet);
walletRoute.post('/fund-paystack', requireUser, controllers.WalletController.fund_wallet_paystack);
walletRoute.post('/paystack/webhook', controllers.WalletController.paystack_webhook);
walletRoute.post('/fund-flutterwave', requireUser, controllers.WalletController.fund_flutterwave);
walletRoute.post('/flutterwave/webhook', controllers.WalletController.flutterwave_webhook);
walletRoute.post('/transfer', requireUser, controllers.WalletController.transferFundsNew);
walletRoute.get('/notifications', requireUser, controllers.WalletController.getNotifications);
module.exports = {
    walletRoute
}