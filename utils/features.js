import { v2 as cloudinary } from "cloudinary";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { v4 as uuid } from "uuid";
import { getBase64, getSockets } from "../lib/helper.js";

// connecting database
export const connectDB = async (uri) => {
  try {
    await mongoose.connect(uri);
    console.log("\nMongoDB Connected\n");
  } catch (error) {
    throw error;
  }
};

// Send token function
export const cookieOption = {
  maxAge: 24 * 60 * 60 * 1000, //in miliseconds (one day)
  sameSite: "none",
  httpOnly: true,
  secure: true,
};
export const sendToken = (res, user, code, message) => {
  // const userWithoutPassword = { ...user.toObject() }; // if using Mongoose, otherwise use {...user}
  // delete userWithoutPassword.password; // Safe, even if password doesn't exist

  const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET); //{user:user} saves the user in the encrypted token, you can acces this by decripting it.

  return res
    .status(code)
    .cookie("chattu-token", token, cookieOption)
    .json({ success: true, message, user });
};

export const emitEvent = (req, event, users, data) => {
  const io = req.app.get("io");

  const usersSocket = getSockets(users);
  io.to(usersSocket).emit(event, data);
};

// UPLOADING FILES TO CLOUDINARY
export const uploadFilesToCloudinary = async (files = []) => {
  const uploadPromises = files.map((file) => {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        getBase64(file),
        {
          resource_type: "auto",
          public_id: uuid(),
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
    });
  });

  try {
    const results = await Promise.all(uploadPromises);
    // console.log(results);
    const formattedResults = results.map((result) => ({
      public_id: result.public_id,
      url: result.secure_url,
    }));

    return formattedResults;
  } catch (err) {
    throw new Error("Error uploading files to cloudinary", err);
  }
};

// Deleting files from couldinary
export const deleteFilesFromCloudinary = async (public_ids) => {};
