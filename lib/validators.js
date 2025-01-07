import { body, validationResult, check, param } from "express-validator";
import { ErrorHandler } from "../utils/utility.js";

export const validateHandler = (req, res, next) => {
  const errors = validationResult(req);

  if (errors.isEmpty()) return next();

  //   console.log(errors);
  const errorMessages = errors
    .array()
    .map((err) => err.msg)
    .join(", ");

  next(new ErrorHandler(errorMessages, 400));
};

export const registerValidator = () => [
  body("name", "Please Enter Name").notEmpty(),
  body("username", "Please Enter username").notEmpty(),
  body("password", "Please Enter password").notEmpty(),
];

export const loginValidator = () => [
  body("username", "Please Enter username").notEmpty(),
  body("password", "Please Enter password").notEmpty(),
];

export const newGroupValidator = () => [
  body("name", "Please Enter name").notEmpty(),
  body("members").notEmpty().withMessage("Please Include Members"),
];

export const addMemberValidator = () => [
  body("chatId", "Please Enter chatId").notEmpty(),
  body("members")
    .notEmpty()
    .withMessage("Please Include Members")
    .isArray({ min: 1, max: 97 })
    .withMessage("Memebers must be 1-9"),
];

export const removeMemberValidator = () => [
  body("chatId", "Please Enter chatId").notEmpty(),
  body("userId", "Please Enter userId").notEmpty(),
];

export const sendAttachmentsValidator = () => [
  body("chatId", "Please Enter chatId").notEmpty(),
];

export const chatIdValidator = () => [
  param("id", "Please Enter chatId").notEmpty(),
];

export const renameGroupValidator = () => [
  param("id", "Please Enter chatId").notEmpty(),
  body("name", "Please enter a valid name").notEmpty(),
];

export const sendRequestValidator = () => [
  body("userId", "Please enter a userId").notEmpty(),
];

export const acceptRequestValidator = () => [
  body("requestId", "Please enter a requestId").notEmpty(),
  body("accept")
    .notEmpty()
    .withMessage("Please add accept")
    .isBoolean()
    .withMessage("Accept must be a boolean"),
];
