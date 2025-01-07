import multer from "multer";

export const multerUpload = multer({
  limits: {
    fileSize: 1024 * 1024 * 10,
  },
});

export const singleAvatar = multerUpload.single("avatar");

export const attachmentsMulter = multerUpload.array("files", 5);
