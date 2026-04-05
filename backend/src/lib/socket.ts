import http from "http";
import express from "express";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);

// Track user-to-socket mapping
const userSocketMap: Record<string, string> = {};

// Track group-to-member-sockets mapping
const groupMembersMap: Record<string, Set<string>> = {};

const io = new Server(server, {
  cors: { 
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  },
});

// Get socket ID by user ID
export function getReceiverSocketId(userId: string): string | undefined {
  return userSocketMap[userId];
}

// Join a group room
export function joinGroupRoom(groupId: string, userId: string) {
  if (!groupMembersMap[groupId]) {
    groupMembersMap[groupId] = new Set();
  }
  groupMembersMap[groupId].add(userId);
}

// Leave a group room
export function leaveGroupRoom(groupId: string, userId: string) {
  if (groupMembersMap[groupId]) {
    groupMembersMap[groupId].delete(userId);
    if (groupMembersMap[groupId].size === 0) {
      delete groupMembersMap[groupId];
    }
  }
}

// Get all members of a group
export function getGroupMemberSockets(groupId: string): string[] {
  const members = groupMembersMap[groupId];
  if (!members) return [];
  return Array.from(members).map(userId => userSocketMap[userId]).filter(Boolean) as string[];
}

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  if (userId && typeof userId === "string") {
    userSocketMap[userId] = socket.id;
  }

  // Send online users to everyone
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // ============================================
  // GROUP SOCKET EVENTS
  // ============================================

  // Join group room
  socket.on("joinGroup", (groupId: string) => {
    if (userId && typeof userId === "string") {
      socket.join(groupId);
      joinGroupRoom(groupId, userId);
      console.log(`User ${userId} joined group ${groupId}`);
    }
  });

  // Leave group room
  socket.on("leaveGroup", (groupId: string) => {
    if (userId && typeof userId === "string") {
      socket.leave(groupId);
      leaveGroupRoom(groupId, userId);
      console.log(`User ${userId} left group ${groupId}`);
    }
  });

  // Send group message (real-time)
  socket.on("sendGroupMessage", (data: { groupId: string; message: unknown }) => {
    const { groupId, message } = data;
    // Broadcast to all members in the group room
    io.to(groupId).emit("newGroupMessage", message);
    console.log(`Group message sent to group ${groupId}`);
  });

  // Group created/updated (notify all members)
  socket.on("groupUpdated", (data: { groupId: string; group: unknown }) => {
    const { groupId, group } = data;
    io.to(groupId).emit("groupUpdated", group);
  });

  // Member added to group (notify the group)
  socket.on("memberAdded", (data: { groupId: string; group: unknown; newMembers: unknown[] }) => {
    const { groupId, group, newMembers } = data;
    // Notify all group members
    io.to(groupId).emit("groupUpdated", group);
    // Notify new members individually
    newMembers.forEach((member: unknown) => {
      const memberUser = member as { _id: string };
      const memberSocketId = userSocketMap[memberUser._id];
      if (memberSocketId) {
        io.to(memberSocketId).emit("groupCreated", group);
      }
    });
  });

  // Member removed from group
  socket.on("memberRemoved", (data: { groupId: string; userId: string; group: unknown }) => {
    const { groupId, userId, group } = data;
    // Notify the group
    io.to(groupId).emit("groupUpdated", group);
    // Notify the removed user
    const removedSocketId = userSocketMap[userId];
    if (removedSocketId) {
      io.to(removedSocketId).emit("removedFromGroup", { groupId });
    }
  });

  // User left group
  socket.on("userLeftGroup", (data: { groupId: string; group: unknown }) => {
    const { groupId, group } = data;
    io.to(groupId).emit("groupUpdated", group);
  });

  // Group deleted
  socket.on("groupDeleted", (groupId: string) => {
    io.to(groupId).emit("groupDeleted", { groupId });
    // Clean up group members
    delete groupMembersMap[groupId];
  });

  // Disconnect
  socket.on("disconnect", () => {
    if (userId && typeof userId === "string") {
      delete userSocketMap[userId];
      // Remove from all groups
      Object.keys(groupMembersMap).forEach(groupId => {
        leaveGroupRoom(groupId, userId);
      });
    }
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };
