const bankUsers = require("../models/yumUsersModel");
const userTransaction = require("../models/transactionNewModel");

const trans_pin = async (req, res, next) => {
    const id = req.user._id;
    const {pin} = req.body;
    if (!pin || typeof pin !== 'string' || pin.length !== 4) {
        return res.status(400).json({ error: 'Invalid transaction pin. It must be a 4-digit string.' });
      }
      if(pin === 1111){
        return res.status(400).json({ error: 'Enter a new transaction pin. This is the default pin' });
      }
      try {
        // Find the user by userId
        const user = await bankUsers.findById(id);
    
        if (!user) {
          return res.status(404).json({ error: 'User not found.' });
        }
    
        // Update the user's transaction pin
        user.transactionPin = pin;
        await user.save();
        
        res.json({ message: 'Transaction pin created successfully.' });
      } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
      }
}

const user_transactions = async (req, res) => {
  const  userId  = req.user._id;
  console.log(userId);
  try {
    const transactions = await userTransaction.find({ userId: userId });
    
    if (!transactions || transactions.length === 0) {
      return res.status(400).json({ error: "No transactions found for the specified user" });
    }

    res.json({
      status: "ok",
      message: "Here are the user transactions",
      data: transactions,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
};




module.exports = {
    trans_pin,
    user_transactions,
}