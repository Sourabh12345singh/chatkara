import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    password: { type: String, minlength: 6 }, // Optional - not required for Google OAuth users
    profilePic: { type: String, default: "" },
    googleId: { type: String }, // Store Google OAuth ID
    isGoogleUser: { type: Boolean, default: false }, // Flag for Google users
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
