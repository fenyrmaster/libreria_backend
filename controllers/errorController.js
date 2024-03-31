const ApiErrors = require("../utils/appError");

const handleCastError = err => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new ApiErrors(message, 400);
}

const handleJWTError = () => new ApiErrors("El token no es valido", 401);
const handleJWTExpiredError = () => new ApiErrors("Tienes que acceder de nuevo", 401);

const handleDuplicateField = err => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Este valor ya esta en uso: ${value} Por favor usa otro valor`;
  return new ApiErrors(message, 400)
}

const handleInvalidFields = err => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join(". ")}`;
  return new ApiErrors(message, 400)
}

const errorDev = (err, req, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  })
}
const erorrProd = (err,req,res) => {
if(req.originalUrl.startsWith("/api")){
  if(err.isOperational){
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    })
  }
} else{
  if(err.isOperational){
    res.status(err.statusCode).render("error", {
      title: "Something went wrong",
      msg: err.message
    })
  }
}
}

module.exports = (err,req,res,next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if(process.env.NODE_ENV === "development"){
    errorDev(err, req, res);
  } else if(process.env.NODE_ENV === "production") {
    let newError = Object.create(err);
    
    if(newError.name === "CastError") newError = handleCastError(newError);
    if(newError.code === 11000) newError = handleDuplicateField(newError);
    if(newError.name === "ValidationError") newError = handleInvalidFields(newError);
    if(newError.name === "JsonWebTokenError") newError = handleJWTError();
    if(newError.name === "TokenExpiredError") newError = handleJWTExpiredError();
    erorrProd(newError, req, res);
  }
};