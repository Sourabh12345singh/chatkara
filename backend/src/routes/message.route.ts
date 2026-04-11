import { Router, type Request, type Response } from "express";
import { protectRoute } from "../middleware/auth.middleware";
import {
  getMessages,
  getUnreadCounts,
  getUsersForSidebar,
  markConversationRead,
  sendMessage,
} from "../controllers/message.controller";

const router = Router();

// @ts-ignore - TypeScript compatibility issue with custom request types
router.get("/users", protectRoute, getUsersForSidebar);
// @ts-ignore
router.get("/unread-counts", protectRoute, getUnreadCounts);
// @ts-ignore
router.post("/read/:id", protectRoute, markConversationRead);
// @ts-ignore
router.get("/:id", protectRoute, getMessages);
// @ts-ignore
router.post("/send/:id", protectRoute, sendMessage);

export default router;
