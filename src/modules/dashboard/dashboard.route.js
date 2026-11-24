import express from "express";
import {
  getDashboardSummary,
  getDisciplineScore,
  getWeeklyActivity,
} from "./dashboard.controller.js";
import { verifyAccessToken } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.get("/summary", verifyAccessToken, getDashboardSummary);
router.get("/discipline-score", verifyAccessToken, getDisciplineScore);
router.get("/weekly-activity", verifyAccessToken, getWeeklyActivity);

export default router;
