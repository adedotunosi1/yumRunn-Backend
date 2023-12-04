const bankUsers = require('../models/yumUsersModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT_SECRET = "duibfsfuyws8722efyfvuy33762";
const {APIError} = require('../utils/apiError');
const nodemailer = require('nodemailer');
const randomstring = require('randomstring');
const { createNewUser } = require('../services');
const UserWallet = require('../models/walletModel');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const userTransaction = require('../models/transactionNewModel');
const walletNotification = require('../models/notifications');
const { initiatePayment } = require('./paystackController')
const crypto = require('crypto');
const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com';
const PUBLIC_KEY = process.env.FLUTTERWAVE_PUBLIC_KEY;
const SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const axios = require('axios');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

function generateTransactionReference() {
  const timestamp = new Date().getTime(); // Get current timestamp
  const randomString = Math.random().toString(36).substring(7); // Generate a random string
  return `TXREF_${timestamp}_${randomString}`;
}

// Usage example
const tx_ref = generateTransactionReference();
function generateAccountNumber() {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}

const userWallet = async (req, res) => {
  const userId = req.user._id;

  try {
    const user = await bankUsers.findOne({ _id: userId });

    if (!user) {
      return res.status(404).json({ error: "User does not exist!!" });
    }

    const walletName = user.fullName;

    let userWalletInstanceNaira = await UserWallet.findOne({ userId });

    let walletAccountNumber = "";

    if (!userWalletInstanceNaira) {
      walletAccountNumber = generateAccountNumber();

      userWalletInstanceNaira = await UserWallet.create({
        walletType: "NAIRA",
        userId,
        walletName,
        walletAccountNumber,
      });

      const notificationMessage = "Welcome! Your Naira Wallet is Ready!";
      const nairaNotificationMessage = `Your Naira Account Number: ${walletAccountNumber}!`;

      await Promise.all([
        new walletNotification({ userId, message: notificationMessage }).save(),
        new walletNotification({ userId, message: nairaNotificationMessage }).save()
      ]);
    }

    const { naira: nairaBalance } = userWalletInstanceNaira.balance;

    return res.json({
      message: "Naira Wallet created successfully",
      userWalletNaira: userWalletInstanceNaira,
      nairaBalance
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
};




const walletBalance = async (req, res) => {
    const {userId} = req.body;
    try {
        const myUserWallet = await UserWallet.findOne({ userId });
        if(!myUserWallet){
            return res.status(400).json({error: "This user has no wallet"});
          } 
        const nairaWalletBalance = myUserWallet.balance.naira;
        const usdWalletBalance = myUserWallet.balance.usd;
        res.status(200).json({walletdata: myUserWallet, nairaWalletBalance, usdWalletBalance});
    } catch (error) {
        console.log(error);
        res.json({ error: "Internal Server Error", message: error });
    }
}
const transporter = nodemailer.createTransport({
  service: process.env.SMPT_SERVICE, // e.g., 'Gmail'
  auth: {
    user: process.env.SMPT_MAIL,
    pass: process.env.SMPT_PASSWORD,
  },
});

const sendTransactionReceipt = async (email, transaction) => {
  try {
    // Create a PDF document
    const doc = new PDFDocument();
    const pdfDirectory = path.join(__dirname, 'pdfs');
    if (!fs.existsSync(pdfDirectory)) {
      fs.mkdirSync(pdfDirectory);
    }

    const filePath = path.join(pdfDirectory, 'transaction_receipt.pdf'); // Set the path where the PDF will be saved temporarily

    // Pipe the PDF content to a writable stream and save it to a file
    const pdfStream = doc.pipe(fs.createWriteStream(filePath));

    // Listen for the finish event to ensure the PDF is fully generated
    pdfStream.on('finish', async () => {
      try {
        // Read the PDF file
        const pdfData = fs.readFileSync(filePath);

        // Convert PDF data to Base64 for inline display
        const pdfBase64 = pdfData.toString('base64');

        // Construct the email content with styling
        const mailOptions = {
          from: process.env.APP_EMAIL,
          to: email,
          subject: 'Wallet Bank App Payment Receipt',
          html: `
          <html>
          <head>
          <style>
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            background-color: #f7f7f7;
          }
        
          h2 {
            color: #0073e6;
            margin-bottom: 16px;
            animation: fadeIn 1s ease;
          }
        
          p {
            color: #333; /* Changed text color to a darker shade for better readability */
            margin-bottom: 16px;
            animation: fadeIn 1s ease;
          }
        
          table {
            border-collapse: collapse;
            width: 100%;
            margin-bottom: 20px;
            border-radius: 4px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            animation: slideIn 1s ease;
          }
        
          th {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
            background-color: #0073e6;
            color: #fff;
          }
        
          td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
            background-color: #f0f0f0; /* Changed background color to a lighter shade for better contrast */
            color: #333; /* Changed text color to a darker shade for better readability */
          }
        
          tr.success {
            background-color: #e6f7e6;
          }
        
          tr.error {
            background-color: #f7e6e6;
          }
        
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
        
          @keyframes slideIn {
            from {
              transform: translateY(-20px);
            }
            to {
              transform: translateY(0);
            }
          }
        </style>        
          </head>
          <body>
            <h2>Transaction Receipt</h2>
            <table>
              <tr>
                <th>Transaction ID:</th>
                <td>${transaction._id}</td>
              </tr>
              <tr>
                <th>Wallet Type:</th>
                <td>${transaction.walletType}</td>
              </tr>
              <tr>
                <th>Amount:</th>
                <td>${transaction.amount}</td>
              </tr>
              <tr>
                <th>Payment Status:</th>
                <td>${transaction.paymentStatus}</td>
              </tr>
              <tr>
                <th>Transaction Type:</th>
                <td>${transaction.transactionType}</td>
              </tr>
              <tr>
                <th>Payment Gateway:</th>
                <td>${transaction.paymentGateway}</td>
              </tr>
            </table>
            <p>Check attachment for pdf receipt.</p>
          </body>
          </html>
          `,
          attachments: [
            {
              filename: 'mytransaction_receipt.pdf', // Renamed the attached PDF file
              content: pdfData,
            },
          ],
        };

        // Send the email
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${email}: Transaction Receipt`);

        // Remove the temporary PDF file
        fs.unlinkSync(filePath);
      } catch (error) {
        console.error(`Email sending failed: ${error}`);
      }
    });

    // Add content to the PDF
    // Set font and styling
// Set font and styling
// Set font and styling
doc.font('Helvetica');
doc.fillColor('#000000'); // Black color
doc.fontSize(22).text('Transaction Receipt', { align: 'center' });

// Add space
doc.moveDown();

// Create a table for transaction details
const tableX = 50; // X-coordinate for the table
const tableY = doc.y; // Current Y-coordinate
const cellWidth = 200;
const cellHeight = 30;
const cellPadding = 5;
const headerBackgroundColor = '#0073e6'; // Header cell background color
const headerTextColor = '#ffffff'; // Header cell text color

// Define table headers and rows
const tableData = [
  ['Transaction ID', transaction._id],
  ['User ID', transaction.userId],
  ['Wallet Type', transaction.walletType],
  ['Amount', transaction.amount],
  ['Payment Status', transaction.paymentStatus],
  ['Transaction Type', transaction.transactionType],
  ['Payment Gateway', transaction.paymentGateway],
];

// Define function to draw a table cell
const drawTableCell = (text, x, y, width, height, backgroundColor, textColor) => {
  doc.rect(x, y, width, height).fill(backgroundColor);
  doc.fillColor(textColor).text(text, x + cellPadding, y + cellPadding, {
    width: width - 2 * cellPadding,
    height: height - 2 * cellPadding,
    align: 'left',
    valign: 'center',
  });
};

// Draw table headers
drawTableCell(tableData[0][0], tableX, tableY, cellWidth, cellHeight, headerBackgroundColor, headerTextColor);
drawTableCell(tableData[0][1], tableX + cellWidth, tableY, cellWidth, cellHeight, headerBackgroundColor, headerTextColor);

// Draw table rows
for (let i = 1; i < tableData.length; i++) {
  const rowY = tableY + i * cellHeight;
  drawTableCell(tableData[i][0], tableX, rowY, cellWidth, cellHeight, '#ffffff', '#000000');
  drawTableCell(tableData[i][1], tableX + cellWidth, rowY, cellWidth, cellHeight, '#ffffff', '#000000');
}

// Add space
doc.moveDown();

// Add a thank you message
doc.fontSize(22).text('Thank you for choosing', { align: 'center' });
doc.fontSize(22).fillColor('#0073e6').text('Wallet App', { align: 'center' });

// Add space
doc.moveDown(2);

// Add a footer with Chipper Cash branding
doc.fontSize(10).fillColor('#333333'); // Dark gray color
doc.text('Powered by Wallet', { align: 'center' });

// Finalize the PDF
doc.end();


  } catch (error) {
    console.error(`PDF generation failed: ${error}`);
  }
};


const fund_wallet = async (req, res) => {
    const { userId, walletType, userEmail, amount } = req.body;
    try {
      // Find the user's wallet
      const wallet = await UserWallet.findOne({ userId });
  
      if (!wallet) {
        return res.status(404).json({ error: "Wallet not found" });
      }

      if (amount > 1000000) {
        return res.status(403).json({ error: "Thief! Dey Play!" });
      }
      //fix this not working above
      let paymentStatus;

    // Determine the payment status based on specific conditions
    if (amount > 0 && amount <= 50) {
      paymentStatus = "failed";
    } else if (amount > 50 && amount < 100) {
      paymentStatus = "pending";
    } else {
      paymentStatus = "successful";
    }
       // Create a transaction history entry
      const transaction = new userTransaction({
        userId,
        walletType,
        amount,
        paymentStatus,
        transactionType: "Deposit",
        paymentGateway: 'Demo'
      });

       // Save the transaction
       await transaction.save();
       
        // Update the wallet balance only if payment status is successful
       if (paymentStatus === "successful") {
        wallet.balance[walletType] += parseFloat(amount);
        await wallet.save();

        const userNotification = new walletNotification({
          userId,
          message: `You funded ${amount} into your wallet.`
        });
        await userNotification.save();

        await sendTransactionReceipt(userEmail, transaction); // Send user a transaction receipt
        res.json({ message: "Wallet funded successfully", wallet });
      } else if(paymentStatus === "pending"){
        res.json({ message: "Wallet funding pending", wallet });
      } else {
        res.json({ message: "Wallet funding failed", wallet });
      }
  
    } catch (error) {
      console.log(error);
      res.json({ error: "Internal server error", message: error });
    }
}

const fund_wallet_paystack = async (req, res) => {
  const userId = req.user._id;
  const email = req.user.email;
  const { walletType, amount } = req.body;

  try {
      // Find the user's wallet
      const wallet = await UserWallet.findOne({ userId });

      if (!wallet) {
          return res.status(404).json({ error: "Wallet not found" });
      }

      if (walletType === 'usd') {
          let paymentStatus;

          // Determine the payment status based on specific conditions
          if (amount > 0 && amount <= 50) {
              paymentStatus = "failed";
          } else if (amount > 50 && amount < 100) {
              paymentStatus = "pending";
          } else {
              paymentStatus = "successful";
          }

          // Create a transaction history entry
          const transaction = new userTransaction({
              userId,
              walletType,
              amount,
              paymentStatus,
              transactionType: "Deposit",
              paymentGateway: 'Demo'
          });

          // Save the transaction
          await transaction.save();

          // Update the wallet balance only if payment status is successful
          if (paymentStatus === "successful") {
              wallet.balance[walletType] += parseFloat(amount);
              await wallet.save();

              const userNotification = new walletNotification({
                  userId,
                  message: `You funded $${amount} into your wallet.`
              });
              await userNotification.save();

              await sendTransactionReceipt(email, transaction); // Send user a transaction receipt
              res.status(205).json({ message: "Wallet funded successfully", wallet });
          } else if (paymentStatus === "pending") {
              res.json({ message: "Wallet funding pending", wallet });
          } else {
              res.json({ message: "Wallet funding failed", wallet });
          }
      } else if (walletType === 'naira') {
          // Handle logic for "naira" transactions here
          const paystackResponse = await initiatePayment(amount, email);
          
          console.log('Paystack Response Data:', paystackResponse);

          // Check for Paystack request errors
          if (paystackResponse instanceof Error) {
              console.error('Paystack request error:', paystackResponse.message);
              return res.status(500).json({ error: "Paystack request failed", message: paystackResponse.message });
          }
          // Return the authorization URL to the client
              res.json({
              authorizationUrl: paystackResponse.data.authorization_url,
              message: 'User should be redirected here and then click successful',
           });
        } else {
          return res.status(400).json({ error: "Invalid wallet type" });
      }

  } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error", message: error.message });
  }
};

// const paystack_callback = async (req, res) => {
//   try {
//     // Handle the Paystack callback logic here
//     // This is where you can update your database based on the callback data
//     // You can access the callback data from req.body
//     const { userId, walletType, amount, reference, status } = req.body;
    
//     if (status === 'success') {
//       // Payment was successful
//       // Update your database and mark the transaction as completed
//       const transaction = new userTransaction({
//         userId,
//         walletType,
//         amount,
//         reference,
//         paymentStatus: 'successful',
//         transactionType: "Deposit"
//       });

//       // Update the user's wallet balance
//       const wallet = await UserWallet.findOne({ userId: transaction.userId });
//       wallet.balance[transaction.walletType] += transaction.amount;
//       await wallet.save();

//       const userNotification = new walletNotification({
//         userId,
//         message: `You funded ${amount} into your wallet.`
//       });
//       await userNotification.save();

//       // Send a response to the client
//       res.json({ message: "Wallet funded successfully", wallet });
//     } else {
//       // Payment failed
//       // Handle the failure case (e.g., update the transaction status)
//       const transaction = await userTransaction.findOneAndUpdate(
//         { reference },
//         { paymentStatus: 'failed' },
//         { new: true }
//       );

//       // Send a response to the client
//       res.json({ message: "Payment failed" });
//     }
//   } catch (error) {
//     // Handle errors
//     console.error('Callback Error:', error);
//     res.status(500).send('Callback Error');
//   }
// };

// const test_callback = async (req, res) => {
//   try {
//     // Parse the callback data from Paystack
//     const { reference, status, amount } = req.body;
//     console.log(reference);
//     if (status === 'success') {
//         // Payment was successful

//          // Update the user's wallet balance
//       const wallet = await UserWallet.findOne({ userId: transaction.userId });
//       wallet.balance[transaction.walletType] += transaction.amount;
//       await wallet.save();

//       const userNotification = new walletNotification({
//         userId,
//         message: `You funded ${amount} into your wallet.`
//       });
//       await userNotification.save();
//         // Update your database and mark the transaction as completed
//         const transaction = await userTransaction.findOneAndUpdate(
//             { reference },
//             { paymentStatus: 'successful', amount }, // Update the payment status and amount
//             { new: true }
//         );

//     } else {
//         // Payment failed
//         // Handle the failure case (e.g., update the transaction status)
//         const transaction = await userTransaction.findOneAndUpdate(
//             { reference },
//             { paymentStatus: 'failed' },
//             { new: true }
//         );
//     }

//     // Respond to the Paystack callback with a 200 OK status
//     res.status(200).send('Callback Received');
// } catch (error) {
//     // Handle errors
//     console.error('Callback Error:', error);
//     res.status(500).send('Callback Error');
// }
// }

const paystack_webhook = async (req, res) => {
  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    const payload = JSON.stringify(req.body);

    const hash = crypto
      .createHmac('sha512', secretKey)
      .update(payload)
      .digest('hex');

    const paystackSignature = req.headers['x-paystack-signature'];

    if (hash === paystackSignature) {
      const event = req.body.event;
      const reference = req.body.data.reference;
      const email = req.body.data.customer.email;
      const amount = req.body.data.amount / 100; // Paystack amount is in kobo, convert to naira or usd
      const user = await bankUsers.findOne({ email });
      const  userId = user._id.toString(); // Convert the ObjectId to a string
      if (event === 'charge.success') {
    
        const wallet = await UserWallet.findOne({ userId });
        if (!wallet) {
          return res.status(404).send('User wallet not found');
        }

        wallet.balance['naira'] += amount;
        await wallet.save();
        
        const userNotification = new walletNotification({
          userId,
          message: `Your wallet has been successfully funded with ₦${amount} via Paystack.`
        });
        await userNotification.save();

        const transaction = new userTransaction({
          userId,
          walletType: 'naira',
          amount,
          reference,
          paymentStatus: 'successful',
          transactionType: 'Deposit',
          paymentGateway: 'Paystack'
        });
        await transaction.save();
      } else if (event === 'charge.failure') {
          // Create a transaction history entry
          const transaction = new userTransaction({
            userId,
            walletType: 'naira',
            amount,
            paymentStatus: 'failed',
            transactionType: "Deposit",
            paymentGateway: 'Paystack'
        });

        await transaction.save();
      }

      // Respond to the Paystack webhook with a 200 OK status
      res.status(200).send('Webhook Received');
    } else {
      res.status(400).send('Invalid Webhook Signature');
    }
  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).send('Webhook Error');
  }
};

const transfer_funds = async (req, res) => {
  const {walletType, receiverId, amount, pin} = req.body;
  const {userId} = req.params;
  try {
    const wallet = await UserWallet.findOne({userId});
    if (!wallet) {
      return res.status(404).json({ error: "User has no Wallet" });
    }

    const senderBalance = wallet.balance[walletType];
    const receiverBalance = wallet.balance[walletType][receiverId];
    
    let paymentStatus = senderBalance >= amount ? "successful" : "failed";

    const user = await bankUsers.findById(userId);
    const userPin = user.transactionPin; 

    if (pin != userPin) {
      return res.status(400).json({ error: "Invalid PIN, Kindly Reset Your Pin!" });
    } else if(pin === 1111){
      return res.status(400).json({ error: 'This is the default pin. Create your transaction pin to proceed.' });
    }
 
    const transaction = new userTransaction({
      userId,
      transactionType: "Withdrawal",
      walletType,
      amount,
      paymentStatus,
      paymentGateway: 'Demo'
      });

       // Save the transaction
       await transaction.save();
    
    if(paymentStatus === "failed"){
      const errorMessage =
        walletType === "naira"
          ? "Insufficient naira balance for transfer"
          : "Insufficient USD balance for transfer";
      return res.status(400).json({ error: errorMessage });
    } else {
      wallet.balance[walletType] -= amount;
      wallet.balance[walletType][receiverId] += amount;
  
      await wallet.save();
     if(walletType === 'naira'){
      const userNotification = new walletNotification({
        userId,
        message: `You have successfully transferred ₦${amount} to ${receiverId}`
      })
      await userNotification.save();
      return res.json({ message: 'Naira Funds transferred successfully', message: userNotification });
    } else if (walletType === 'usd'){
      const userNotification = new walletNotification({
        userId,
        message: `You have successfully transferred $${amount} to ${receiverId}`
      })
      await userNotification.save();
      return res.json({ message: 'Dollar Funds transferred successfully', message: userNotification });
    }
    }
  
  } catch (error) {
    console.log(error);
    res.json({error: error});
  }


}

const transferFundsNew = async (req, res) => {
  const userId = req.user._id;
  const { walletType, receiverAccountNumber, amount, pin } = req.body;

  try {
      const sender = await bankUsers.findById(userId);
      if (!sender) {
          return res.status(404).json({ error: "User not found" });
      }

      const senderWallet = await UserWallet.findOne({ userId });
      if (!senderWallet) {
          return res.status(404).json({ error: "You have no Wallet" });
      }

      const senderBalance = senderWallet.balance[walletType];

      if (senderBalance < amount) {
          return res.status(400).json({ error: "Insufficient balance for transfer" });
      }

      // Find receiver using account number
      const receiverWallet = await UserWallet.findOne({ "accountNumber": receiverAccountNumber });
      if (!receiverWallet) {
          return res.status(400).json({ error: "Receiver not found" });
      }
      console.log(receiverWallet);

       // Check if the sender is trying to send funds to their own account
    if (receiverWallet.userId.toString() === userId) {
      return res.status(400).json({ error: "Cannot send funds to your own account" });
    }

       // Convert both walletType values to lowercase for case-insensitive comparison
    const senderWalletTypeLower = senderWallet.walletType.toLowerCase();
    const receiverWalletTypeLower = receiverWallet.walletType.toLowerCase();

    if (receiverWalletTypeLower !== senderWalletTypeLower) {
      return res.status(404).json({ error: "Wallets do not match: Naira to Naira & USD to USD only!" });
    }

      const userPin = sender.transactionPin;

      if (pin !== userPin) {
          return res.status(400).json({ error: "Invalid PIN, Kindly Reset Your Pin!" });
      } else if (pin === 1111) {
          return res.status(400).json({ error: 'This is the default pin. Create your transaction pin to proceed.' });
      }

      const transaction = new userTransaction({
          userId,
          transactionType: "Withdrawal",
          walletType,
          amount,
          paymentStatus: "successful",
          paymentGateway: 'Demo'
      });

      // Save the transaction
      await transaction.save();

      senderWallet.balance[walletType] -= amount;
      receiverWallet.balance[walletType] += amount;

      await senderWallet.save();
      await receiverWallet.save();

      const currencySymbol = walletType === 'naira' ? '₦' : '$';
      const receiverName = receiverWallet.accountName;
      console.log(receiverName);
      const userNotification = new walletNotification({
          userId,
          message: `You have successfully transferred ${currencySymbol}${amount} to ${receiverName}: ${receiverAccountNumber}`
      });

      await userNotification.save();

      const successMessage = walletType === 'naira'
          ? 'Naira Funds transferred successfully'
          : 'Dollar Funds transferred successfully';

      return res.json({ message: successMessage, notification: userNotification });

  } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
}


const fund_flutterwave = async (req, res) => {
  const email = req.user.email;
  const { amount } = req.body;
  const tx_ref = generateTransactionReference(); // Generate a unique tx_ref

  if (!email) {
    return res.status(400).json({ error: 'Please specify the email parameter in the request body' });
  }

  if (amount < 200) {
    return res.status(403).json({ error: "Your amount must be over 200" });
  }

  const data = {
    tx_ref,
    amount,
    currency: 'NGN',
    payment_type: 'bank-transfer',
    redirect_url: 'https://wallet-wb.vercel.app/wallet/success/',
    order_id: 'order_id',
    customer: {
      email,
    },
    meta: {
      consumer_id: 23,
      consumer_mac: "92a3-912ba-1192a"
    },
    customizations: {
      title: "Wallet Bank App",
      logo: "https://wallet-wb.vercel.app/vite.svg"
    }
  };
  const payload = JSON.stringify(data);

  const headers = {
    'Authorization': `Bearer ${SECRET_KEY}`,
    'Content-Type': 'application/json',
  };

  try {
    const response = await axios.post(`https://api.flutterwave.com/v3/payments`, payload, { headers });

    if (response.data.status === 'success') {
      const paymentLink = response.data.data.link;
      res.json({ data: paymentLink, message: 'User has to click the above link' });
    } else {
      res.status(400).json({ error: 'Payment initialization failed' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


const flutterwave_webhook = async (req, res) => {
  const { event, data } = req.body;
  const email = req.body.data.customer.email;
  const amount = req.body.data.amount; 
  const reference = req.body.data.flw_ref;
  const user = await bankUsers.findOne({ email });
  const  userId = user._id.toString(); // Convert the ObjectId to a string
  if (event === 'charge.completed') {
    
        const wallet = await UserWallet.findOne({ userId });
        if (!wallet) {
          return res.status(404).send('User wallet not found');
        }

        wallet.balance['naira'] += amount;
        await wallet.save();
        
        const userNotification = new walletNotification({
          userId,
          message: `Your wallet has been successfully funded with ₦${amount} via Flutterwave.`
        });
        await userNotification.save();

        const transaction = new userTransaction({
          userId,
          walletType: 'naira',
          amount,
          reference,
          paymentStatus: 'successful',
          transactionType: 'Deposit',
          paymentGateway: 'Flutterwave'
        });
        await transaction.save();
            
    res.status(200).send('Webhook received');
      } else if (event === 'charge.failure') {
         
          const transaction = new userTransaction({
            userId,
            walletType: 'naira',
            amount,
            paymentStatus: 'failed',
            transactionType: "Deposit",
            paymentGateway: 'Flutterwave'
        });

        await transaction.save();
      } else {
    res.status(400).send('Invalid event');
  }
}

const createWalletTransaction = async (res, req) => {
    const {userId, status, currency, amount} = req.body;
    try {
        const walletTransactions = await walletTransaction.create({
      amount,
      userId,
      isInflow: true,
      currency,
      status,
        });
        return walletTransactions;
        
    } catch (error) {
        console.log(error);
    }
}

const getNotifications = async (req, res) => {
  const  userId  = req.user._id;
  try {
    const notifications = await walletNotification.find({ userId });
    if (notifications.length === 0) {
      return res.status(400).json({ error: "This user has no notifications" });
    }

    res.json({ data: notifications, message: "Here are your notifications" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
};

const createNewTransaction = async (req, res) => {
    const {userId, id, status, currency, amount, customer} = req.body;
    try {
        const transaction = await Transaction.create({
            userId,
            transactionId: id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone_number,
            amount,
            currency,
            paymentStatus: status,
            paymentGateway: "flutterwave",
          });
          return transaction;
    } catch (error) {
        console.log(error)
    }
}

const updateUserWallet = async (req, res) => {
    const {userId, amount} = req.body;
try {
    const Wallet = await UserWallet.findOneAndUpdate(
        {userId},
        {$inc: {balance: amount}},
        {new: true}
    );
    return Wallet;
} catch (error) {
    console.log(error);
}
}

const transactionResponse = async (req, res) => {
    const {transaction_id} = req.query;
    const url = `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`;

  // Network call to confirm transaction status
  const response = await axios({
    url,
    method: "get",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `${process.env.FLUTTERWAVE_V3_SECRET_KEY}`,
    },
  });

  const { status, currency, id, amount, customer } = response.data.data;

   // check if transaction id already exist
   const transactionExist = await Transaction.findOne({ transactionId: id });

   if (transactionExist) {
     return res.status(409).send("Transaction Already Exist");
   }
   
  // check if customer exist in our database
  const user = await bankUsers.findOne({ email: customer.email });

  // check if user have a wallet, else create wallet
  const wallet = await userWallet(user._id);

  // create wallet transaction
  await createWalletTransaction(user._id, status, currency, amount);

  // create transaction
  await createNewTransaction(user._id, id, status, currency, amount, customer);

  await updateUserWallet(user._id, amount);

  return res.status(200).json({
    response: "wallet funded successfully",
    data: wallet,
  });
}

module.exports = {
    updateUserWallet,
    createNewTransaction,
    userWallet,
    fund_wallet,
    createWalletTransaction,
    transactionResponse,
    walletBalance,
    transfer_funds,
    getNotifications,
    transferFundsNew,
    fund_wallet_paystack,
    paystack_webhook,
    fund_flutterwave,
    flutterwave_webhook,
}