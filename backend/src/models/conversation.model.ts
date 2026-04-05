import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    conversationId: { type: String, index: true, unique: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
    lastMessage: {
      text: { type: String, default: "" },
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      createdAt: { type: Date },
    },
    lastRead: {
      type: Map,
      of: Date,
      default: {},
    },
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1 });
conversationSchema.index({ "lastMessage.createdAt": -1 });

export default mongoose.model("Conversation", conversationSchema);
