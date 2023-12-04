const express = require('express')
const controller = require('../controllers');

const bankRoute = express.Router();

bankRoute.get('/banks', controller.BankAccountController.ng_banks);
bankRoute.post('/validate-account', controller.BankAccountController.validateBankAccount);
bankRoute.post('/add-account', controller.BankAccountController.addBankAccount);
bankRoute.get('/bank-accounts', controller.BankAccountController.userBankAccounts);
bankRoute.post('/delete-bank', controller.BankAccountController.deleteBankAccount);
module.exports = {
    bankRoute
} 