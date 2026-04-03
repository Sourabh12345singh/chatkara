import type { Request, Response, NextFunction } from "express";
import type { Document, Types } from "mongoose";

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

export type AuthController = (req: AuthenticatedRequest, res: Response, next?: NextFunction) => Promise<Response | undefined> | Response | undefined;
