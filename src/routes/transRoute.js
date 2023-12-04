const express = require('express');
const Controller = require('../controllers');
const { requireUser } = require('../middlewares/auth.middleware');

const transRoute = express.Router();

transRoute.post('/create_pin', Controller.TransactionController.trans_pin);
transRoute.get('/transdata', requireUser, Controller.TransactionController.user_transactions);

module.exports = {
    transRoute,
}

