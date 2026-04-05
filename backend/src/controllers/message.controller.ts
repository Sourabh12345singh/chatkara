import type { Response } from "express";
import Message from "../models/message.model";
import User from "../models/user.model";
import { getReceiverSocketId, io } from "../lib/socket";
import type { AuthenticatedRequest } from "../types";
import {
  ensureMetaUser,
  extractMetaIntent,
  generateMetaReplyWithDebug,
  shouldGenerateMetaReplyOnce,
  upsertMessageEmbedding,
} from "../lib/meta-ai";

// Helper function to generate conversation ID
function getConversationId(userId1: string, userId2: string): string {
  const sortedIds = [userId1, userId2].sort();
  return `conv_${sortedIds[0]}_${sortedIds[1]}`;
}

export const getUsersForSidebar = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const loggedInUserId = req.user?._id;
    if (!loggedInUserId) return res.status(401).json({ message: "Unauthorized request" });

    const users = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");
    const messages = await Message.find({
      $or: [
        { senderId: loggedInUserId },
        { receiverId: loggedInUserId },
      ],
    })
      .select("senderId receiverId createdAt")
      .sort({ createdAt: -1 });

    const lastMessageByUser = new Map<string, Date>();

    messages.forEach((message) => {
      const senderId = message.senderId.toString();
      const receiverId = message.receiverId?.toString();
      const otherUserId = senderId === loggedInUserId.toString() ? receiverId : senderId;

      if (!otherUserId || lastMessageByUser.has(otherUserId)) return;
      lastMessageByUser.set(otherUserId, message.createdAt);
    });

    const sortedUsers = users.sort((a, b) => {
      const aTime = lastMessageByUser.get(a._id.toString())?.getTime() ?? 0;
      const bTime = lastMessageByUser.get(b._id.toString())?.getTime() ?? 0;
      return bTime - aTime;
    });

    res.status(200).json(sortedUsers);
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getMessages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user?._id;
    if (!myId || !userToChatId || Array.isArray(userToChatId)) {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    // Pagination params
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;
    const skip = (page - 1) * limit;

    // Use conversationId for efficient querying
    const conversationId = getConversationId(myId, userToChatId);

    // Optimized query with pagination
    const messages = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("senderId", "fullName profilePic");

      

    // Get total count for pagination info
    const total = await Message.countDocuments({ conversationId });

    res.status(200).json({
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + messages.length < total,
      },
    });
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const sendMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id: receiverId } = req.params;
    const senderId = req.user?._id;
    const { text, image } = req.body as { text?: string; image?: string };

    if (!senderId || !receiverId || Array.isArray(receiverId)) {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    // Generate conversation ID
    const conversationId = getConversationId(senderId, receiverId);

    const intent = typeof text === "string" ? extractMetaIntent(text) : null;

    const newMessage = await Message.create({
      senderId,
      receiverId,
      conversationId,
      text: text ?? "",
      image: image ?? "",
    });

    const populatedMessage = await Message.findById(newMessage._id).populate("senderId", "fullName profilePic");

    void upsertMessageEmbedding({
      messageId: newMessage._id.toString(),
      text: text ?? "",
      senderId: senderId.toString(),
      conversationId,
      kind: "direct",
      minWords: intent?.useVector ? 1 : undefined,
    });

    // Real-time delivery
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", populatedMessage);
    }

    res.status(201).json(populatedMessage);

    if (!intent) return;

    const metaUser = await ensureMetaUser();

    void (async () => {
      try {
        if (!shouldGenerateMetaReplyOnce(`direct:${newMessage._id.toString()}`)) return;
        const aiResult = await generateMetaReplyWithDebug(intent.query, conversationId, intent.useVector);
        if (!aiResult.reply) return;

        const aiMessage = await Message.create({
          senderId: metaUser._id,
          receiverId: senderId,
          conversationId,
          text: aiResult.reply,
        });

        const populatedAi = await Message.findById(aiMessage._id).populate("senderId", "fullName profilePic");
        const metaPayload = {
          ...(populatedAi?.toObject ? populatedAi.toObject() : populatedAi),
          metaInfo: aiResult.metaInfo,
        };

        void upsertMessageEmbedding({
          messageId: aiMessage._id.toString(),
          text: aiResult.reply,
          senderId: metaUser._id.toString(),
          conversationId,
          kind: "direct",
          minWords: intent.useVector ? 1 : undefined,
        });

        const senderSocketId = getReceiverSocketId(senderId.toString());
        if (senderSocketId) {
          io.to(senderSocketId).emit("newMessage", metaPayload);
        }
      } catch {
        // Fail silently to avoid breaking the user message flow.
      }
    })();
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};
