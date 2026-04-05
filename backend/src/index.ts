import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./lib/db";
import authRoutes from "./routes/auth.route";
import messageRoutes from "./routes/message.route";
import groupRoutes from "./routes/group.route";
import googleAuthRoutes from "./routes/google-auth.route";
import { app, server } from "./lib/socket";

// ============================================
// PASSPORT & SESSION SETUP (For Google OAuth)
// ============================================
import passport from "./lib/passport";
import session from "express-session";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = Number(process.env.PORT ?? 5001);

// ============================================
// MIDDLEWARE SETUP
// ============================================
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_URL ?? "http://localhost:5173",
    credentials: true,
  })
);

// ============================================
// SESSION MIDDLEWARE (Required for Passport OAuth)
// ============================================
// This creates a session that passport uses to store user info between requests
app.use(
  session({
    secret: process.env.JWT_SECRET as string, // Use JWT_SECRET as session secret
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  })
);

// ============================================
// PASSPORT INITIALIZATION
// ============================================
// Initialize passport and use session to maintain login state
app.use(passport.initialize());
app.use(passport.session());

// ============================================
// ROUTES
// ============================================
app.use("/api/auth", authRoutes);         // Regular auth (signup, login, logout)
app.use("/api/auth", googleAuthRoutes);   // Google OAuth routes
app.use("/api/messages", messageRoutes);   // 1-on-1 Messages API
app.use("/api/groups", groupRoutes);      // Group Chat API

// ============================================
// PRODUCTION STATIC FILES
// ============================================
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
  });
}

// ============================================
// START SERVER
// ============================================
server.listen(port, "0.0.0.0", () => {
  void connectDB();
  console.log(`Server running on port ${port}`);
});
