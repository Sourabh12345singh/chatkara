import jwt from "jsonwebtoken"
import User from "../models/user.model";
import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "../types";

export const protectRoute = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.jwt;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Convert mongoose document to plain object with string _id
    req.user = {
      _id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic || "",
    };
    next();
  } catch {
    res.status(500).json({ message: "Internal server error" });
  }
};
