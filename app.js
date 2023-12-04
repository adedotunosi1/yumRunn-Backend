const express = require("express");
const app = express();
const bodyParser = require('body-parser');
const dbConnect = require('./dbConnect');
const cors = require('cors');
const yumRouter = require("./src/routes");
const { serverRequests } = require("./src/middlewares/server.middleware");
const { routeError, errorHandler } = require('./src/middlewares/error.middleware');
const cookieParser = require('cookie-parser');
const winston = require('winston');
const { makeUsers } = require("./src/middlewares/user.middleware");

dbConnect();
app.set('view engine', 'ejs');
app.use(express.urlencoded({extended: true}));
const allowedOrigins = ["https://yum-run.vercel.app/", "http://localhost:5173", "http://localhost:4000"];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
// app.use((req, res, next) => {
//     res.setHeader("Access-Control-Allow-Origin", "*");
//     res.setHeader(
//       "Access-Control-Allow-Headers",
//       "Origin, X-Requested-With, Content, Accept, Content-Type, Authorization"
//     );
//     res.setHeader(
//       "Access-Control-Allow-Methods",
//       "GET, POST, PUT, DELETE, PATCH, OPTIONS"
//     );
//     next();
//   });
 
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false}));
app.use(express.json());

// Winston logger setup
const logger = winston.createLogger({
  level: 'debug', // Adjust log level as needed
  format: winston.format.simple(),
  transports: [
    new winston.transports.Console(), // Log to the console
  ],
});

// Request logging middleware
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.url}`);
  next();
});

//BANK APP MIDDLEWARES
app.use(cookieParser());
// app.use(makeUser);
app.use(makeUsers)
app.use("/api/v1/", yumRouter);
app.use("/api/v1", (req, res, next) => {
  res.send({ msg: `Yes!... Welcome to yumRun API` });
  next();
});
app.use(serverRequests);
app.get("/", (req, res, next) => {
    res.send(`
    <h2> Yum Run Server </h2>
    `)
    next();
})

// Error handling for "Route not found"
app.use(routeError);

// Global error handling middleware
app.use(errorHandler);


module.exports = app;