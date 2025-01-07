import jwt from "jsonwebtoken";
import { ErrorHandler } from "../utils/utility.js";
import { TryCatch } from "./error.js";
import { CHATTU_TOKEN } from "../constants/config.js";
import { User } from "../models/user.model.js";

export const isAuthenticated = TryCatch((req, res, next) => {
  const token = req.cookies["chattu-token"];
  // console.log("cookie token: ", token);

  if (!token) {
    return next(new ErrorHandler("Please login to access this route", 401));
  }

  const decodedData = jwt.verify(token, process.env.JWT_SECRET); //provide user, which we stored earlier in the token encrypted
  // console.log("decoded: ", decodedData);
  req.user = decodedData._id;
  // console.log(req.user);

  next();
});

export const socketAuthenticator = async (err, socket, next) => {
  try {
    if (err) return next(err);
    const authToken = socket.request.cookies[CHATTU_TOKEN];
    if (!authToken)
      return next(new ErrorHandler("Please login to access this route", 401));

    const decodedData = jwt.verify(authToken, process.env.JWT_SECRET);
    const user = await User.findById(decodedData._id);
    if (!user) return next(new ErrorHandler("User does not exist ", 401));

    socket.user = user;
    return next();
  } catch (error) {
    // console.log(error);
    return next(new ErrorHandler("Please login to access this resource", 401));
  }
};
