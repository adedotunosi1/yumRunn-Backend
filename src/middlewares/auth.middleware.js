const jwt = require('jsonwebtoken');

const requireUser = (req, res, next) => {
    if (!req.user) return res.status(403).send("Invalid Session, You must sign in!");
  return next();
}

const userLogout = (req, res, next) => {
   res.cookie("accessToken", "", {
    maxAge: 0,
    httpOnly: true,
   });

   res.cookie("refreshToken", "", {
    maxAge: 0,
    httpOnly: true,
   });

  return res.status(200).send({
    status: 'success',
    message: 'User logged out',
    data: null,
});
}

module.exports = {
    userLogout,
    requireUser
}