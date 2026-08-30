import express from "express";
import {
  getProblems,
  updateUserProblem,
  getOverview,
  getTopicBreakdownController,
  getRecentProblemsController,
} from "./allProblems.controller.js";
import { verifyAccessToken } from "../../../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", verifyAccessToken, getProblems);
router.get("/overview-count", verifyAccessToken, getOverview);
router.get("/topic-wise-problem", verifyAccessToken, getTopicBreakdownController);
router.get("/recent-problems", verifyAccessToken, getRecentProblemsController);
router.post("/:problemId", verifyAccessToken, updateUserProblem);

export default router;
