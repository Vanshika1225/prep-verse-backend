import express from "express";
import {
  createRoadmap,
  getRoadmaps,
  getRoadmapById,
  getOverallProgress,
  getRecommendedRoadmaps,
  getUpcomingMilestones,
  startRoadmap,
  updateMilestoneStatus,
  deleteRoadmap,
} from "./roadmap.controller.js";
import { verifyAccessToken } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", verifyAccessToken, createRoadmap);
router.get("/", verifyAccessToken, getRoadmaps);
router.get("/overall-progress", verifyAccessToken, getOverallProgress);
router.get("/recommended", verifyAccessToken, getRecommendedRoadmaps);
router.get("/upcoming-milestones", verifyAccessToken, getUpcomingMilestones);
router.get("/:id", verifyAccessToken, getRoadmapById);
router.post("/:id/start", verifyAccessToken, startRoadmap);

router.post(
  "/:id/milestones/:milestoneId/update",
  verifyAccessToken,
  updateMilestoneStatus
);

router.post("/:id/delete", verifyAccessToken, deleteRoadmap);

export default router;