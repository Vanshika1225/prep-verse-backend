import express from "express";
import {
  getApplications,
  getApplicationStats,
  getUpcomingInterviews,
  getRecentActivity,
  getFilterOptions,
  createApplication,
  getApplicationById,
  updateApplication,
  updateApplicationStatus,
  deleteApplication,
} from "./jobTracker.controller.js";
import { verifyAccessToken } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", verifyAccessToken, getApplications);
router.get("/stats", verifyAccessToken, getApplicationStats);
router.get("/upcoming-interviews", verifyAccessToken, getUpcomingInterviews);
router.get("/recent-activity", verifyAccessToken, getRecentActivity);
router.get("/filters", verifyAccessToken, getFilterOptions);

router.post("/", verifyAccessToken, createApplication);
router.get("/:id", verifyAccessToken, getApplicationById);
router.put("/:id", verifyAccessToken, updateApplication);
router.patch("/:id/status", verifyAccessToken, updateApplicationStatus);
router.delete("/:id", verifyAccessToken, deleteApplication);

export default router;