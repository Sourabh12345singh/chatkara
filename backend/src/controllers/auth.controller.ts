import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary";
import { generateToken } from "../lib/utils";
import User from "../models/user.model";
import type { Response } from "express";
import type { AuthenticatedRequest } from "../types";

export const signup = async (req: AuthenticatedRequest, res: Response) => {
  const { fullName, email, password } = req.body as { fullName?: string; email?: string; password?: string };
  try {
    if (!fullName || !email || !password) return res.status(400).json({ message: "All fields are required" });
    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
    if (await User.findOne({ email })) return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ fullName, email, password: hashedPassword });
    generateToken(newUser._id.toString(), res);
    res.status(201).json({ _id: newUser._id, fullName, email, profilePic: newUser.profilePic });
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const login = async (req: AuthenticatedRequest, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };
  try {
    const user = await User.findOne({ email });
    if (!user || !password || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    generateToken(user._id.toString(), res);
    res.status(200).json({ _id: user._id, fullName: user.fullName, email: user.email, profilePic: user.profilePic });
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logout = (_req: AuthenticatedRequest, res: Response) => {
  res.cookie("jwt", "", { maxAge: 0 });
  res.status(200).json({ message: "Logged out successfully" });
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { profilePic } = req.body as { profilePic?: string };
    if (!profilePic) return res.status(400).json({ message: "Profile pic is required" });
    if (!req.user?._id) return res.status(401).json({ message: "Unauthorized request" });

    const uploadResponse = await cloudinary.uploader.upload(profilePic, { folder: "profile_pics" });
    const updatedUser = await User.findByIdAndUpdate(req.user._id, { profilePic: uploadResponse.secure_url }, { new: true });
    res.status(200).json(updatedUser);
  } catch {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const checkAuth = (req: AuthenticatedRequest, res: Response) => {
  res.status(200).json(req.user);
};
