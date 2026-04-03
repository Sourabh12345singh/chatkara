import { Router, type Request, type Response } from "express";
import { checkAuth, login, logout, signup, updateProfile } from "../controllers/auth.controller";
import { protectRoute } from "../middleware/auth.middleware";

const router = Router();

// @ts-ignore - TypeScript compatibility issue with custom request types
router.post("/signup", signup);
// @ts-ignore
router.post("/login", login);
// @ts-ignore
router.post("/logout", logout);
// @ts-ignore
router.put("/update-profile", protectRoute, updateProfile);
// @ts-ignore
router.get("/check", protectRoute, checkAuth);

export default router;
