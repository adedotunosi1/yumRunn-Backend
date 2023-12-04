const fs = require('fs');
const multer = require('multer'); 

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, '../services/userimages');
    },
    filename: function (req, file, cb) {
      cb(null, 'profileImage-' + Date.now())
    },
  });
  
  const upload = multer({ storage: storage});
  

  module.exports = {
    upload,
  };