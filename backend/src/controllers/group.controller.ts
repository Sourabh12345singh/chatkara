import type { Response } from "express";
import mongoose from "mongoose";
import Group from "../models/group.model";
import Message from "../models/message.model";
import User from "../models/user.model";
import { io } from "../lib/socket";
import cloudinary from "../lib/cloudinary";
import type { AuthenticatedRequest } from "../types";
import {
  ensureMetaUser,
  extractMetaIntent,
  generateMetaReplyForGroupWithDebug,
  shouldGenerateMetaReplyOnce,
  upsertMessageEmbedding,
} from "../lib/meta-ai";

export const createGroup = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, members, groupPic } = req.body as {
      name?: string;
      members?: string[];
      groupPic?: string;
    };
    const hasCloudinaryConfig = Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );

    const adminId = req.user?._id;

    if (!adminId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Group name is required" });
    }

    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ message: "Please select at least one member" });
    }

    // Sanitize members (remove duplicates, nulls, admin)
    const sanitizedMembers = [
      ...new Set(
        members
          .map((id) => id?.toString().trim())
          .filter((id) => id && id !== adminId.toString())
      ),
    ];

    // Fetch only valid users
    const existingUsers = await User.find({
      _id: { $in: sanitizedMembers },
    }).select("_id");

    const validMemberIds = existingUsers.map((user) =>
      user._id.toString()
    );

    if (validMemberIds.length === 0) {
      return res.status(400).json({
        message: "Please select at least one valid member",
      });
    }

    // Add admin to group members
    const allMembers = [
      ...new Set([adminId.toString(), ...validMemberIds]),
    ];

    let groupPicUrl = "";
    if (groupPic) {
      if (!hasCloudinaryConfig) {
        return res.status(500).json({ message: "Cloudinary is not configured" });
      }
      const uploadResult = await cloudinary.uploader.upload(groupPic, { folder: "group_pics" });
      groupPicUrl = uploadResult.secure_url;
    }

    //  Create group
    const group = await Group.create({
      name: name.trim(),
      groupPic: groupPicUrl,
      admin: adminId,
      members: allMembers,
    });

    // ✅ Populate without extra query
    await group.populate([
      { path: "members", select: "fullName email profilePic" },
      { path: "admin", select: "fullName email profilePic" },
    ]);

    // ✅ Emit to all members (optimized)
    io.to(allMembers).emit("groupCreated", group);

    // ✅ Response
    return res.status(201).json(group);
  } catch (error: any) {
    console.error("createGroup failed:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


export const getMyGroups = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // Sort by lastMessage (most recent first), fallback to updatedAt
    const groups = await Group.find({ members: userId })
      .populate("members", "fullName email profilePic")
      .populate("admin", "fullName email profilePic")
      .populate("lastMessage")
      .sort({ lastMessage: -1, updatedAt: -1 });

    res.status(200).json(groups);
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getGroupById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { groupId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const group = await Group.findById(groupId)
      .populate("members", "fullName email profilePic")
      .populate("admin", "fullName email profilePic");

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user is a member
    const isMember = group.members.some(
      (m) => m._id.toString() === userId
    );

    if (!isMember) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    res.status(200).json(group);
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getGroupMessages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { groupId } = req.params;
    const userId = req.user?._id;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (!group.members.some(m => m.toString() === userId)) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    group.lastRead.set(userId.toString(), new Date());
    await group.save();

    // Pagination params - already uses index on groupId + createdAt
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;
    const skip = (page - 1) * limit;

    // Optimized query with pagination (uses index)
    const messages = await Message.find({ groupId })
      .populate("senderId", "fullName profilePic")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments({ groupId });

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

export const getGroupUnreadCounts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const groups = await Group.find({ members: userId }).select("_id lastRead");
    const userIdString = userId.toString();

    const counts = await Promise.all(
      groups.map(async (group) => {
        const lastReadAt = group.lastRead?.get(userIdString) ?? new Date(0);
        const unread = await Message.countDocuments({
          groupId: group._id,
          senderId: { $ne: userId },
          createdAt: { $gt: lastReadAt },
        });
        return { groupId: group._id.toString(), count: unread };
      })
    );

    const result: Record<string, number> = {};
    counts.forEach((entry) => {
      result[entry.groupId] = entry.count;
    });

    res.status(200).json(result);
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const markGroupRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { groupId } = req.params;
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!group.members.some((m) => m.toString() === userId)) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    group.lastRead.set(userId.toString(), new Date());
    await group.save();

    res.status(200).json({ success: true });
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const sendGroupMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { groupId } = req.params;
    const senderId = req.user?._id;
    const { text, image } = req.body as { text?: string; image?: string };
    const hasCloudinaryConfig = Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );

    if (!senderId) return res.status(401).json({ message: "Unauthorized" });
    if (!groupId || Array.isArray(groupId)) {
      return res.status(400).json({ message: "Invalid group id" });
    }

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (!group.members.some(m => m.toString() === senderId)) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    const intent = typeof text === "string" ? extractMetaIntent(text) : null;

    let imageUrl = "";
    if (image) {
      if (!hasCloudinaryConfig) {
        return res.status(500).json({ message: "Cloudinary is not configured" });
      }
      const uploadResult = await cloudinary.uploader.upload(image, { folder: "message_images" });
      imageUrl = uploadResult.secure_url;
    }

    const newMessage = await Message.create({
      senderId,
      groupId,
      text: text ?? "",
      image: imageUrl,
    });

    const populatedMessage = await Message.findById(newMessage._id).populate("senderId", "fullName profilePic");

    void upsertMessageEmbedding({
      messageId: newMessage._id.toString(),
      text: text ?? "",
      senderId: senderId.toString(),
      groupId,
      kind: "group",
      minWords: intent?.useVector ? 1 : undefined,
    });

    // Socket: Emit to all group members in real-time
    io.to(groupId).emit("newGroupMessage", populatedMessage);

    // Update group's lastMessage
    group.lastMessage = newMessage._id;
    group.lastRead.set(senderId.toString(), new Date());
    await group.save();

    res.status(201).json(populatedMessage);

    if (!intent) return;

    const metaUser = await ensureMetaUser();

    void (async () => {
      try {
        if (!shouldGenerateMetaReplyOnce(`group:${newMessage._id.toString()}`)) return;
        const aiResult = await generateMetaReplyForGroupWithDebug(intent.query, groupId, intent.useVector);
        if (!aiResult.reply) return;

        const aiMessage = await Message.create({
          senderId: metaUser._id,
          groupId,
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
          groupId,
          kind: "group",
          minWords: intent.useVector ? 1 : undefined,
        });

        io.to(groupId).emit("newGroupMessage", metaPayload);
      } catch {
        // Fail silently to avoid breaking the group flow.
      }
    })();
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateGroup = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { groupId } = req.params;
    const adminId = req.user?._id;
    const { name, groupPic } = req.body as { name?: string; groupPic?: string };
    const hasCloudinaryConfig = Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );

    if (!adminId) return res.status(401).json({ message: "Unauthorized" });

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (group.admin.toString() !== adminId) {
      return res.status(403).json({ message: "Only admin can update group" });
    }

    if (name) group.name = name;
    if (groupPic) {
      if (!hasCloudinaryConfig) {
        return res.status(500).json({ message: "Cloudinary is not configured" });
      }
      const uploadResult = await cloudinary.uploader.upload(groupPic, { folder: "group_pics" });
      group.groupPic = uploadResult.secure_url;
    }

    await group.save();
    const updatedGroup = await Group.findById(groupId)
      .populate("members", "fullName email profilePic")
      .populate("admin", "fullName email profilePic");

    // Socket: Notify all members about group update
    io.to(groupId).emit("groupUpdated", updatedGroup);

    res.status(200).json(updatedGroup);
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const addMembersToGroup = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { groupId } = req.params;
    const adminId = req.user?._id;
    const { members } = req.body as { members: string[] };

    if (!adminId) return res.status(401).json({ message: "Unauthorized" });

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (group.admin.toString() !== adminId) {
      return res.status(403).json({ message: "Only admin can add members" });
    }

    const newMembers = members.filter(m => !group.members.includes(m as unknown as mongoose.Types.ObjectId));
    group.members.push(...newMembers as unknown as mongoose.Types.ObjectId[]);
    await group.save();

    const updatedGroup = await Group.findById(groupId)
      .populate("members", "fullName email profilePic")
      .populate("admin", "fullName email profilePic");

    // Socket: Notify existing members
    io.to(groupId).emit("groupUpdated", updatedGroup);

    // Socket: Notify new members they were added
    newMembers.forEach((memberId) => {
      io.to(memberId).emit("groupCreated", updatedGroup);
    });

    res.status(200).json(updatedGroup);
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const removeMemberFromGroup = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { groupId, userId } = req.params;
    const adminId = req.user?._id;

    if (!adminId) return res.status(401).json({ message: "Unauthorized" });

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (group.admin.toString() !== adminId) {
      return res.status(403).json({ message: "Only admin can remove members" });
    }

    if (userId === group.admin.toString()) {
      return res.status(400).json({ message: "Cannot remove admin from group" });
    }

    group.members = group.members.filter(m => m.toString() !== userId);
    await group.save();

    const updatedGroup = await Group.findById(groupId)
      .populate("members", "fullName email profilePic")
      .populate("admin", "fullName email profilePic");

    // Socket: Notify remaining members
    io.to(groupId).emit("groupUpdated", updatedGroup);

    // Socket: Notify removed user
    io.to(userId).emit("removedFromGroup", { groupId, group: updatedGroup });

    res.status(200).json(updatedGroup);
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const leaveGroup = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { groupId } = req.params;
    const userId = req.user?._id;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (group.admin.toString() === userId) {
      return res.status(400).json({ message: "Admin cannot leave. Delete the group instead." });
    }

    group.members = group.members.filter(m => m.toString() !== userId);
    await group.save();

    const updatedGroup = await Group.findById(groupId)
      .populate("members", "fullName email profilePic")
      .populate("admin", "fullName email profilePic");

    // Socket: Notify remaining members
    io.to(groupId).emit("groupUpdated", updatedGroup);

    res.status(200).json({ message: "Left group successfully" });
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deleteGroup = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { groupId } = req.params;
    const adminId = req.user?._id;

    if (!adminId) return res.status(401).json({ message: "Unauthorized" });

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (group.admin.toString() !== adminId) {
      return res.status(403).json({ message: "Only admin can delete group" });
    }

    await Message.deleteMany({ groupId });
    await Group.findByIdAndDelete(groupId);

    // Socket: Notify all members the group was deleted
    io.to(groupId).emit("groupDeleted", { groupId });

    res.status(200).json({ message: "Group deleted successfully" });
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};
