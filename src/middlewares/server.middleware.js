const serverRequests = (req, res, next) => {
  console.log('new request made: ');
  console.log('host: ', req.hostname);
  console.log('path: ', req.path);
  console.log('method: ', req.method);
  next();
}

module.exports = {
    serverRequests,
}