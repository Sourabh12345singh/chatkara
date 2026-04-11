import { Router, type Request, type Response } from "express";
import { protectRoute } from "../middleware/auth.middleware";
import {
  createGroup,
  getMyGroups,
  getGroupById,
  getGroupMessages,
  getGroupUnreadCounts,
  markGroupRead,
  sendGroupMessage,
  updateGroup,
  addMembersToGroup,
  removeMemberFromGroup,
  leaveGroup,
  deleteGroup,
} from "../controllers/group.controller";

const router = Router();

// @ts-ignore
router.post("/", protectRoute, createGroup);
// @ts-ignore
router.get("/", protectRoute, getMyGroups);
// @ts-ignore
router.get("/unread-counts", protectRoute, getGroupUnreadCounts);
// @ts-ignore
router.get("/:groupId", protectRoute, getGroupById);
// @ts-ignore
router.get("/:groupId/messages", protectRoute, getGroupMessages);
// @ts-ignore
router.post("/:groupId/read", protectRoute, markGroupRead);
// @ts-ignore
router.post("/:groupId/messages", protectRoute, sendGroupMessage);
// @ts-ignore
router.put("/:groupId", protectRoute, updateGroup);
// @ts-ignore
router.post("/:groupId/members", protectRoute, addMembersToGroup);
// @ts-ignore
router.delete("/:groupId/members/:userId", protectRoute, removeMemberFromGroup);
// @ts-ignore
router.post("/:groupId/leave", protectRoute, leaveGroup);
// @ts-ignore
router.delete("/:groupId", protectRoute, deleteGroup);

export default router;
