import express from "express";
import {
  createPlan,
  getPlans,
  getStats,
  getWeeklySchedule,
  getTodayFocus,
  updateTasksStatus,
} from "./studyPlanner.controller.js";
import { verifyAccessToken } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", verifyAccessToken, createPlan);
router.get("/", verifyAccessToken, getPlans);
router.get("/schedule", verifyAccessToken, getWeeklySchedule);
router.get("/stats", verifyAccessToken, getStats);
router.get("/today-focus", verifyAccessToken, getTodayFocus);
router.patch("/tasks/bulk-status", verifyAccessToken, updateTasksStatus);
export default router;
