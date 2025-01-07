import { compare } from "bcrypt";
import { User } from "../models/user.model.js";
import { Chat } from "../models/chat.model.js";
import { Request } from "../models/request.model.js";
import {
  cookieOption,
  emitEvent,
  sendToken,
  uploadFilesToCloudinary,
} from "../utils/features.js";
import { TryCatch } from "../middlewares/error.js";
import { ErrorHandler } from "../utils/utility.js";
import { NEW_REQUEST, REFETCH_CHATS } from "../constants/events.js";
import { getOtherMemeber } from "../lib/helper.js";

// create new user in database and send cookies
export const NewUser = TryCatch(async (req, res, next) => {
  const { name, username, password, bio = "I am a Newbei" } = req.body;

  const file = req.file;
  // console.log(!file);
  if (!file) {
    return next(new ErrorHandler("Avatar not found", 404));
  }
  const result = await uploadFilesToCloudinary([file]);
  // console.log("here");
  const avatar = {
    public_id: result[0].public_id,
    url: result[0].url,
  };

  const user = await User.create({
    name,
    username,
    password,
    bio,
    avatar: avatar,
  });
  sendToken(res, user, 201, "User created");
});

// User Login
export const login = TryCatch(async (req, res, next) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username }).select("+password");
  if (!user) {
    return next(new ErrorHandler("Invalid Username Or Password", 404));
  }
  const isPasswordMatch = await compare(password, user.password);
  if (!isPasswordMatch) {
    return next(new ErrorHandler("Invalid Username Or Password", 404));
  }
  sendToken(res, user, 200, `Welcome Back. ${user.name}`);
});

// Get my profile
export const getMyProfile = TryCatch(async (req, res, next) => {
  const user = await User.findById(req.user);
  res.status(200).json({
    success: true,
    user,
  });
});

// logout function
export const logout = (req, res) => {
  res
    .status(200)
    .cookie("chattu-token", "", {
      ...cookieOption,
      maxAge: 0,
    })
    .json({
      success: true,
      message: "Logged out successfully",
    });
};

// search user function
export const searchUser = TryCatch(async (req, res, next) => {
  const { name = "" } = req.query;

  const myChats = await Chat.find({ groupChat: false, members: req.user });

  const allUserFromMyChats = myChats.flatMap((chat) => chat.members);
  const allUsersExceptMeAndFriends = await User.find({
    _id: { $nin: allUserFromMyChats },
    name: { $regex: name, $options: "i" },
  });
  const users = allUsersExceptMeAndFriends.map(({ _id, name, avatar }) => ({
    _id,
    name,
    avatar: avatar.url,
  }));
  res.status(200).json({
    success: true,
    users,
  });
});

// send request
export const sendFriendRequest = TryCatch(async (req, res, next) => {
  const { userId } = req.body;

  if (userId.toString() === req.user.toString()) {
    return next(new ErrorHandler("Cant send friend request to self", 400));
  }

  const request = await Request.findOne({
    $or: [
      { sender: userId, recevier: req.user },
      { sender: req.user, recevier: userId },
    ],
  });

  if (request) return next(new ErrorHandler("Request already exist", 400));

  await Request.create({
    sender: req.user,
    recevier: userId,
  });

  emitEvent(req, NEW_REQUEST, [userId]);

  res.status(200).json({
    success: true,
    message: "Friend request sent",
  });
});

// accept freist request
export const acceptFrindRequest = TryCatch(async (req, res, next) => {
  const { requestId, accept } = req.body;
  const request = await Request.findById(requestId)
    .populate("sender", "name")
    .populate("recevier", "name");

  if (!request) return next(new ErrorHandler("reuquest not found", 404));

  if (request.recevier._id.toString() !== req.user.toString()) {
    return next(
      new ErrorHandler("You are not authorized to accept the request")
    );
  }

  if (!accept) {
    await request.deleteOne();
    return res.status(200).json({
      success: true,
      message: "Request deleted succesfully",
    });
  }

  const members = [request.sender._id, request.recevier._id];
  await Promise.all([
    Chat.create({
      members,
      name: `${request.sender.name}-${request.recevier.name}`,
    }),
    request.deleteOne(),
  ]);

  emitEvent(req, REFETCH_CHATS, members);

  res.status(200).json({
    success: true,
    message: "Request accepted",
    senderId: request.sender._id,
  });
});

// get all notifications
export const getAllNotificatins = TryCatch(async (req, res, next) => {
  const requests = await Request.find({ recevier: req.user }).populate(
    "sender",
    "name avatar"
  );

  const allRequests = requests.map(({ _id, sender }) => ({
    _id,
    sender: {
      _id: sender._id,
      name: sender.name,
      avatar: sender.avatar.url,
    },
  }));

  return res.status(200).json({
    success: true,
    allRequests,
  });
});

// get my friends
export const getMyFriends = TryCatch(async (req, res, next) => {
  const chatId = req.query.chatId;

  const chats = await Chat.find({
    members: req.user,
    groupChat: false,
  }).populate("members", "name avatar");

  const friends = chats.map(({ members }) => {
    const otherUser = getOtherMemeber(members, req.user);
    if (otherUser)
      return {
        _id: otherUser._id,
        name: otherUser.name,
        avatar: otherUser.avatar.url,
      };
  });

  if (chatId) {
    const chat = await Chat.findById(chatId);
    const availableFriends = friends.filter(
      (friend) => !chat.members.includes(friend.id)
    );
    return res.status(200).json({
      success: true,
      friends: availableFriends,
    });
  } else {
    return res.status(200).json({
      success: true,
      friends,
    });
  }
});
