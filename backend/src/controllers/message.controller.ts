import type { Response } from "express";
import Message from "../models/message.model";
import User from "../models/user.model";
import { getReceiverSocketId, io } from "../lib/socket";
import type { AuthenticatedRequest } from "../types";

export const getUsersForSidebar = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const loggedInUserId = req.user?._id;
    if (!loggedInUserId) return res.status(401).json({ message: "Unauthorized request" });

    const users = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");
    res.status(200).json(users);
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getMessages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user?._id;
    if (!myId) return res.status(401).json({ message: "Unauthorized request" });

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    });

    res.status(200).json(messages);
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const sendMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id: receiverId } = req.params;
    const senderId = req.user?._id;
    const { text, image } = req.body as { text?: string; image?: string };

    if (!senderId) return res.status(401).json({ message: "Unauthorized request" });

    const newMessage = await Message.create({
      senderId,
      receiverId,
      text: text ?? "",
      image: image ?? "",
    });

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};
