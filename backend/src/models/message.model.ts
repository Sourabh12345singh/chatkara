import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
    conversationId: { type: String, index: true },
    text: { type: String, default: "" },
    image: { type: String, default: "" },
  },
  { timestamps: true }
);

// Indexes for scalability
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ groupId: 1, createdAt: -1 });

// Helper to generate conversation ID
messageSchema.statics.getConversationId = function (userId1: string, userId2: string): string {
  // Sort IDs to ensure same hash regardless of who initiates
  const sortedIds = [userId1, userId2].sort();
  return `conv_${sortedIds[0]}_${sortedIds[1]}`;
};

export default mongoose.model("Message", messageSchema);
