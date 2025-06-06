import {
  ALERT,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  REFETCH_CHATS,
} from "../constants/events.js";
import { getOtherMemeber } from "../lib/helper.js";
import { TryCatch } from "../middlewares/error.js";
import { Chat } from "../models/chat.model.js";
import { Message } from "../models/message.model.js";
import { User } from "../models/user.model.js";
import {
  deleteFilesFromCloudinary,
  emitEvent,
  uploadFilesToCloudinary,
} from "../utils/features.js";
import { ErrorHandler } from "../utils/utility.js";

// creating new Group
export const newGroupChat = TryCatch(async (req, res, next) => {
  const { name, members } = req.body;
  let allMembers = [...members, req.user];
  allMembers = Array.from(new Set(allMembers));
  if (allMembers.length < 3)
    return next(
      new ErrorHandler("Group chat must have at least 3 members", 400)
    );

  await Chat.create({
    name,
    groupChat: true,
    creator: req.user,
    members: allMembers,
  });

  emitEvent(req, ALERT, allMembers, `Welcome to ${name} group`);
  emitEvent(req, REFETCH_CHATS, members);

  return res.status(201).json({
    success: true,
    message: "Group created",
  });
});

// get all my chats
export const getMyChats = TryCatch(async (req, res, next) => {
  const chats = await Chat.find({ members: req.user }).populate(
    "members",
    "name avatar"
  );

  const transformedChats = chats.map(({ _id, name, members, groupChat }) => {
    const otherMember = getOtherMemeber(members, req.user);
    return {
      _id,
      groupChat,
      avatar: groupChat
        ? members.slice(0, 3).map(({ avatar }) => avatar.url)
        : [otherMember.avatar.url],
      name: groupChat ? name : otherMember.name,
      members: members.reduce((prev, curr) => {
        if (curr._id.toString() !== req.user.toString()) {
          prev.push(curr._id);
        }
        return prev;
      }, []),
    };
  });

  return res.status(200).json({
    success: true,
    chats: transformedChats,
  });
});

// get all my groups
export const getMyGroups = TryCatch(async (req, res, next) => {
  const chats = await Chat.find({
    members: req.user,
    groupChat: true,
    creator: req.user,
  }).populate("members", "name avatar");

  const groups = chats.map(({ members, _id, groupChat, name }) => ({
    _id,
    groupChat,
    name,
    avatar: members.slice(0, 3).map(({ avatar }) => avatar.url),
  }));

  return res.status(200).json({
    success: true,
    groups,
  });
});

// adding members to the group
export const addMembers = TryCatch(async (req, res, next) => {
  const { chatId, members } = req.body;
  const chat = await Chat.findById(chatId);

  if (!chat) return next(new ErrorHandler("Chat not found", 404));
  if (!chat.groupChat)
    return next(new ErrorHandler("This is not a group chat", 400));

  if (chat.creator.toString() !== req.user.toString()) {
    return next(new ErrorHandler("You are not allowed to add members", 403));
  }
  if (!members || members.length < 1)
    return next(new ErrorHandler("Please Provide members", 400));

  const allNewMembersPromise = members.map((i) => User.findById(i, "name"));
  const allNewMembers = await Promise.all(allNewMembersPromise);

  const uniqueMembers = allNewMembers
    .filter((i) => !chat.members.includes(i._id.toString()))
    .map((i) => i._id);

  chat.members.push(...uniqueMembers);

  if (chat.members.length > 100)
    return next(new ErrorHandler("Group limit is 100.", 400));

  await chat.save();

  const allUserName = allNewMembers.map((i) => i.name).join(",");

  emitEvent(
    req,
    ALERT,
    chat.members,
    `${allUserName} has been added in the group`
  );

  emitEvent(req, REFETCH_CHATS, chat.members);

  return res.status(200).json({
    success: true,
    message: "Members added succesfully",
  });
});

// removing members from the group
export const removeMembers = TryCatch(async (req, res, next) => {
  const { userId, chatId } = req.body;
  let flg = false;
  if (userId.toString() === req.user.toString()) {
    flg = true;
  }
  const [chat, userThatWillBeRemoved] = await Promise.all([
    Chat.findById(chatId),
    User.findById(userId, "name"),
  ]);

  if (!chat) return next(new ErrorHandler("Chat not found", 404));
  if (!chat.groupChat)
    return next(new ErrorHandler("This is not a group chat", 400));

  if (chat.creator.toString() !== req.user.toString()) {
    return next(new ErrorHandler("You are not allowed to add members", 403));
  }

  if (chat.members.length <= 3)
    return next(new ErrorHandler("Group must have atleast 3 members", 400));

  const allChatMembers = chat.members.map((i) => i.toString());

  chat.members = chat.members.filter(
    (member) => member.toString() !== userId.toString()
  );
  if (flg) {
    chat.creator = chat.members[0].toString();
  }
  await chat.save();

  emitEvent(
    req,
    ALERT,
    chat.members,
    `${userThatWillBeRemoved.name} has been removed from the Group`
  );

  emitEvent(req, REFETCH_CHATS, allChatMembers);

  return res.status(200).json({
    success: true,
    message: "Member removded succesfully",
  });
});

// leaving teh grup
export const leaveGroup = TryCatch(async (req, res, next) => {
  const chatId = req.params.id;

  const chat = await Chat.findById(chatId);

  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  if (!chat.groupChat) next(new ErrorHandler("This is not a group chat", 400));

  const remainingMembers = chat.members.filter(
    (member) => member.toString() !== req.user.toString()
  );
  if (remainingMembers.length == chat.members.length)
    return next(
      new ErrorHandler("Your are not a participante of this group", 400)
    );
  if (remainingMembers.length < 3)
    return next(new ErrorHandler("Group must have atleast three members", 400));

  if (chat.creator.toString() === req.user.toString()) {
    const newCreator = remainingMembers[0];
    chat.creator = newCreator;
  }

  chat.members = remainingMembers;
  const [user] = await Promise.all([
    User.findById(req.user, "name"),
    chat.save(),
  ]);

  emitEvent(req, ALERT, chat.members, `${user.name} has left the group`);

  return res.status(200).json({
    success: true,
    message: "You have left the group succesfully",
  });
});

// send attachments to the chat
export const sendAttachments = TryCatch(async (req, res, next) => {
  const { chatId } = req.body;

  const files = req.files || [];
  if (files.length < 1)
    return next(new ErrorHandler("Please upload files", 400));

  const [chat, me] = await Promise.all([
    Chat.findById(chatId),
    User.findById(req.user, "name"),
  ]);
  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  if (files.length < 1)
    return next(new ErrorHandler("Please provide a attachment", 400));

  //uload files here
  const attachments = await uploadFilesToCloudinary(files);

  const messageForRealTime = {
    content: "",
    attachments,
    sender: {
      _id: me._id,
      name: me.name,
    },
    chat: chatId,
  };
  // console.log(messageForRealTime);

  const messageForDB = {
    content: "",
    attachments,
    sender: me._id,
    chat: chatId,
  };

  const message = await Message.create(messageForDB);

  emitEvent(req, NEW_MESSAGE, chat.members, {
    message: messageForRealTime,
    chatId,
  });

  emitEvent(req, NEW_MESSAGE_ALERT, chat.members, { chatId });

  return res.status(200).json({
    success: true,
    message,
  });
});

// get Chat details
export const getChatDetails = TryCatch(async (req, res, next) => {
  if (req.query.populate === "true") {
    const chat = await Chat.findById(req.params.id)
      .populate("members", "name avatar")
      .lean();
    if (!chat) return next(new ErrorHandler("Chat not found", 404));

    chat.members = chat.members.map(({ _id, name, avatar }) => ({
      _id,
      name,
      avatar: avatar.url,
    }));

    return res.status(200).json({
      success: true,
      chat,
    });
  } else {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return next(new ErrorHandler("Chat not found", 404));

    return res.status(200).json({
      success: true,
      chat,
    });
  }
});

// Rename group
export const renameGroup = TryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const { name } = req.body;

  const chat = await Chat.findById(chatId);

  if (!chat) return next(new ErrorHandler("Chat not Found", 404));

  if (!chat.groupChat)
    return next(new ErrorHandler("This is not a Group Chat", 400));

  if (chat.creator.toString() !== req.user.toString())
    return next(
      new ErrorHandler("Only Admin is Allowed to rename the chat", 403)
    );

  chat.name = name;
  await chat.save();
  emitEvent(req, REFETCH_CHATS, chat.members);

  return res.status(200).json({
    success: true,
    message: "Group renamed successfully",
  });
});

// Delete chat
export const deleteChat = TryCatch(async (req, res, next) => {
  const chatId = req.params.id;

  const chat = await Chat.findById(chatId);

  if (!chat) return next(new ErrorHandler("Chat not Found", 404));

  if (chat.groupChat && chat.creator.toString() !== req.user.toString())
    return next(
      new ErrorHandler("Only Admin is Allowed to delete the chat", 403)
    );

  if (!chat.groupChat && !chat.members.includes(req.user.toString()))
    return next(
      new ErrorHandler("You are not allowed to delete the chat", 403)
    );

  const members = chat.members;

  // here we have to delete all messages as well as attachmenst or files from clodudinary

  const messagesWithAttachments = await Message.find({
    chat: chatId,
    attachments: { $exists: true, $ne: [] },
  });
  const public_ids = [];

  messagesWithAttachments.forEach(({ attachments }) => {
    attachments.forEach(({ public_id }) => public_ids.push(public_id));
  });

  await Promise.all([
    //Delete files From cloudinary
    deleteFilesFromCloudinary(public_ids),
    chat.deleteOne(),
    Message.deleteMany({ chat: chatId }),
  ]);

  emitEvent(req, REFETCH_CHATS, members);

  return res.status(200).json({
    success: true,
    message: "Chat deleted successfully",
  });
});

// Get messagees
export const getMessages = TryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const { page = 1 } = req.query;
  const limit = 20;
  const skip = (page - 1) * limit;

  const chat = await Chat.findById(chatId);

  if (!chat) return next(new ErrorHandler("Chat not found", 404));
  if (!chat.members.includes(req.user.toString()))
    return next(new ErrorHandler("You are not a Part of the Chat", 403));

  const [messages, totalMessagesCount] = await Promise.all([
    Message.find({ chat: chatId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("sender", "name")
      .lean(),
    Message.countDocuments({ chat: chatId }),
  ]);
  const totalPages = Math.ceil(totalMessagesCount / limit) || 0;
  res.status(200).json({
    success: true,
    messages: messages.reverse(),
    totalPages,
  });
});
