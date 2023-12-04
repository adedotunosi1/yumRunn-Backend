const axios = require('axios');
const axiosRetry = require('axios-retry');

const PAYSTACK_KEY = process.env.PAYSTACK_SECRET_KEY;

const paystack = axios.create({
    baseURL: 'https://api.paystack.co',
    headers: {
        Authorization: `Bearer ${PAYSTACK_KEY}`,
    },
}); 

async function initiatePayment(amount, email) {
    try {
        // Convert the amount to kobo (1 Naira = 100 kobo)
        const amountInKobo = amount * 100;

        const response = await paystack.post('/transaction/initialize', {
            amount: amountInKobo, // Send the amount in kobo
            email
        });

        return response.data;
    } catch (error) {
        console.log(error);
        throw error;
    }
}

module.exports = { initiatePayment };