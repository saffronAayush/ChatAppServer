import { ExpressValidator } from "express-validator";
import { userSocketIds } from "../app.js";

export const getOtherMemeber = (members, userId) => {
  return members.find((member) => member._id.toString() != userId.toString());
};

export const getSockets = (users = []) => {
  const sockets = users.map((user) => userSocketIds.get(user.toString()));
  return sockets;
};

export const getBase64 = (file) =>
  `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
