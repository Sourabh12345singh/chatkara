import type { Request } from "express";
import type { Document } from "mongoose";

export type AuthUser = {
  _id: string;
  fullName: string;
  email: string;
  profilePic: string;
};

export type UserDocument = Document & AuthUser & { password: string };

export type MessageDocument = Document & {
  senderId: string;
  receiverId: string;
  text?: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AuthenticatedRequest = Request & {
  user?: AuthUser;
};
