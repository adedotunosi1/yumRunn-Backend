const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;
const crypto = require("crypto");
const fs = require('fs')

//const privateKey = fs.readFileSync('.private_key.pem', 'utf-8');
//const publicKey = fs.readFileSync('.public_key.pem', 'utf-8');

const privateKey = process.env.PRIVATE_KEY.replace(/\\n/g, "\n")
const publicKey = process.env.PUBLIC_KEY.replace(/\\n/g, "\n")

function signJWT(payload) {
    const header = { alg: 'RS256', typ: 'JWT' };
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
  
    const signature = crypto
      .sign('sha256', Buffer.from(`${encodedHeader}.${encodedPayload}`), {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_PADDING,
      })
      .toString('base64');
  
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }
  
  function verifyJWT(token) {
    try {
      const [encodedHeader, encodedPayload, signature] = token.split('.');
      const decodedHeader = Buffer.from(encodedHeader, 'base64').toString('utf-8');
      const decodedPayload = Buffer.from(encodedPayload, 'base64').toString('utf-8');
  
      const verify = crypto.createVerify('sha256');
      verify.update(`${encodedHeader}.${encodedPayload}`);
      const isVerified = verify.verify(publicKey, signature, 'base64');
  
      if (!isVerified) {
        throw new Error('Signature verification failed');
      }
  
      return { payload: JSON.parse(decodedPayload), expired: false };
    } catch (error) {
      console.error('Error decoding access token:', error.message);
      return { payload: null, expired: error.message.includes('jwt expired') };
    }
  }
  
  module.exports = {
    signJWT,
    verifyJWT,
  };