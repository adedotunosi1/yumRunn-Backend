exports.routeError = (req, res, next) => {
    const error = new Error("Route not found");
    error.status = 404;
    next(error);
   // res.status(404).json({ error: error.message});
}

exports.errorHandler = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
      }
      res.status(err.status || 500);
      res.json({ error: err.message });
}