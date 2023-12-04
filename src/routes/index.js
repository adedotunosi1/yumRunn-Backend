const express = require('express');
const yumRouter = express.Router();
const userModule = require('./userRoute');
const authModule = require('./authRoute');
const transModule = require('./transRoute');
const walletModule = require('./walletRoute');

yumRouter.use('/user', userModule.userRoute);
yumRouter.use('/auth', authModule.authRoute);
yumRouter.use('/trans', transModule.transRoute);
yumRouter.use('/wallet', walletModule.walletRoute);

module.exports = yumRouter;