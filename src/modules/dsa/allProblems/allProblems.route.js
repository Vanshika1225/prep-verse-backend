import express from "express";
import {
  getProblems,
  updateUserProblem,
  getOverview,
  getTopicBreakdownController,
  getRecentProblemsController,
} from "./allProblems.controller.js";
import { authenticateJWT } from "../../../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", authenticateJWT, getProblems);
router.get("/overview-count", authenticateJWT, getOverview);
router.get("/topic-wise-problem", authenticateJWT, getTopicBreakdownController);
router.get("/recent-problems", authenticateJWT, getRecentProblemsController);
router.post("/:problemId", authenticateJWT, updateUserProblem);

export default router;
