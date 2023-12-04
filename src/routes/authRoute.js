const express = require("express"); 
const controller = require('../controllers');
const { userLogout, requireUser } = require('../middlewares/auth.middleware');

const authRoute = express.Router();

authRoute.post('/register', controller.AccountController.register);
authRoute.post('/register-google', controller.AccountController.register_google);
authRoute.get('/register-google-callback', controller.AccountController.register_google_callback);
authRoute.post('/login-google', controller.AccountController.google_login);
authRoute.get('/login-google-callback', controller.AccountController.google_login_callback);
authRoute.post('/login', controller.AccountController.login);
authRoute.delete('/logout', userLogout, controller.AccountController.logout);
authRoute.delete('/delete-acc', requireUser, controller.AccountController.delete_account);
authRoute.post('/otp', controller.AccountController.verify_otp);
authRoute.post('/generate_otp', requireUser, controller.AccountController.generate_otp);
authRoute.post('/forgot_pass', controller.AccountController.forgot_pass);
authRoute.post('/pass_reset/:id/:token', requireUser, controller.AccountController.pass_reset);
authRoute.post('/dashboard', controller.AccountController.user_dashboard);
authRoute.post('/user-data', controller.AccountController.user_data_dashboard);
module.exports = {
    authRoute,
}