import express from "express";
import {
  acceptFrindRequest,
  getAllNotificatins,
  getMyFriends,
  getMyProfile,
  login,
  logout,
  NewUser,
  searchUser,
  sendFriendRequest,
} from "../controllers/user.controller.js";
import { singleAvatar } from "../middlewares/multer.js";
import { isAuthenticated } from "../middlewares/auth.js";
import {
  acceptRequestValidator,
  loginValidator,
  registerValidator,
  sendRequestValidator,
  validateHandler,
} from "../lib/validators.js";

const app = express.Router();

// Routes
app.post("/new", singleAvatar, registerValidator(), validateHandler, NewUser);
app.post("/login", loginValidator(), validateHandler, login);

// After here user must be loged in to access routes
app.use(isAuthenticated);
app.get("/me", getMyProfile);
app.get("/logout", logout);
app.get("/search", searchUser);
app.put(
  "/sendrequest",
  sendRequestValidator(),
  validateHandler,
  sendFriendRequest
);
app.put(
  "/accept-request",
  acceptRequestValidator(),
  validateHandler,
  acceptFrindRequest
);
app.get("/notifications", getAllNotificatins);
app.get("/friends", getMyFriends);

// home route to check working
app.get("/", (req, res) => {
  res.send("In user route");
});
export default app;
