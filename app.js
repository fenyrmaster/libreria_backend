const express = require("express");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const cors = require("cors");
const errorHandler = require("./controllers/errorController");
const ApiErrors = require("./utils/appError");
const compression = require("compression");
const xss = require("xss-clean");
const dotenv = require("dotenv");
const rateLimit = require("express-rate-limit");
const db = require("./db");

// Rutas para la base de datos
const userRouter = require("./routes/userRouter");

const app = express();

dotenv.config({ path: './config.env' });

app.use(cors({
  origin: process.env.URL_FRONT,
  credentials: true,
}));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

const limiter = rateLimit({
  max: 250,
  windowMs: 60*60*1000,
  message: "Vuelve a intentarlo mas tarde"
});
app.use("/api", limiter);

app.use(express.json({limit: "20kb"}));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(xss());
app.use(compression());

app.use("/api/usuarios", userRouter);

app.all("*", (req,res,next) => {
  const err = new ApiErrors(`the given URL (${req.originalUrl}) is not valid`, 404);
  next(err);
});

app.use(errorHandler);

module.exports = app;