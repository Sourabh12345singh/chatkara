import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/user.model";
import { generateToken } from "./utils.js";
import type { Response } from "express";

// ============================================
// PASSPORT GOOGLE OAUTH 2.0 CONFIGURATION
// ============================================

// Configure Google Strategy for OAuth 2.0
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.NODE_ENV === "production" 
        ? "/api/auth/google/callback" 
        : "http://localhost:5001/api/auth/google/callback",
    },
    // Callback function - called when Google returns user info
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Get email from Google profile
        const email = profile.emails?.[0].value;
        
        if (!email) {
          return done(new Error("No email found in Google profile"));
        }

        // Check if user already exists by email
        let user = await User.findOne({ email });

        if (!user) {
          // Create new user if not found
          user = await User.create({
            email,
            fullName: profile.displayName || "Google User",
            googleId: profile.id,
            isGoogleUser: true,
            profilePic: profile.photos?.[0]?.value || "",
          });
        } else if (!user.googleId) {
          // If user exists but not as Google user, link accounts
          user.googleId = profile.id;
          user.isGoogleUser = true;
          await user.save();
        }

        // Return the user object
        return done(null, user);
      } catch (error) {
        return done(error as Error | null, undefined);
      }
    }
  )
);

// ============================================
// PASSPORT SERIALIZE/DESERIALIZE
// ============================================

// Serialize user - store user ID in session
passport.serializeUser((user, done) => {
  const typedUser = user as { _id: unknown };
  done(null, typedUser._id);
});

// Deserialize user - get user from ID in session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error as Error | null, undefined);
  }
});

export default passport;
