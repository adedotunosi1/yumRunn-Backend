const express = require('express');
const app = require('./app');
const dbConnect = require('./dbConnect');
const yumRunRouter = require('./src/routes');


const PORT = 4000;
app.listen(PORT, async () => {
  try {
    await dbConnect();
    console.log(`server running on port ${PORT}`);
  } catch (error) {
    (error);
  }
});