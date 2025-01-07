export const errorMiddleware = (err, req, res, next) => {
  err.message ||= "Internal Server Error";
  err.statusCode ||= 500;

  if (err.code === 11000) {
    err.message = `Duplicate field error:- ${Object.keys(err.keyPattern).join(
      ","
    )}`;
    err.statusCode = 400;
  }

  if (err.name === "CastError") {
    err.message = `Invalid Formate of path ${err.path}`;
    err.statusCode = 400;
  }
  return res.status(err.statusCode).json({
    success: false,
    message: err.message,
  });
};

export const TryCatch = (passedFunc) => async (req, res, next) => {
  try {
    await passedFunc(req, res, next);
  } catch (error) {
    next(error);
  }
};
