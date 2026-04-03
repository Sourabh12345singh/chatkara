import { Router } from "express";
import passport from "passport";
import { generateToken } from "../lib/utils";
import type { Response } from "express";

const router = Router();

// ============================================
// GOOGLE OAUTH 2.0 ROUTES
// ============================================

/**
 * GOOGLE LOGIN - Redirect to Google
 * Route: GET /api/auth/google
 * Workflow: User clicks "Login with Google" button → redirects to Google consent screen
 */
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"], // Request these permissions from Google
  })
);

/**
 * GOOGLE CALLBACK - Handle Google response
 * Route: GET /api/auth/google/callback
 * Workflow: Google redirects here after user grants permission
 */
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.CLIENT_URL}/login?error=google_auth_failed`,
  }),
  // On success, create JWT and redirect to frontend
  async (req, res: Response) => {
    try {
      if (!req.user) {
        return res.redirect(`${process.env.CLIENT_URL}/login?error=no_user`);
      }

      // Get the user object (deserialized by passport)
      const user = req.user as { _id: unknown; email: string; fullName: string; profilePic: string };
      
      // Generate JWT token (same as regular login)
      generateToken(user._id as string, res);

      // Redirect to frontend with success
      const redirectUrl = process.env.NODE_ENV === "production"
        ? "/?google_auth=success"
        : "http://localhost:5173/?google_auth=success";

      res.redirect(redirectUrl);
    } catch (error) {
      console.error("Google callback error:", error);
      res.redirect(`${process.env.CLIENT_URL}/login?error=auth_failed`);
    }
  }
);

export default router;
