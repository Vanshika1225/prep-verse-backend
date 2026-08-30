import express from "express";
import {
  getAllPatterns,
  getLearningPoints,
  getPatternDifficulty,
  getRecommendedProblems,
} from "./patternWise.controller.js";
import { verifyAccessToken } from "../../../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", verifyAccessToken, getAllPatterns);
router.get("/:pattern/difficulty", verifyAccessToken, getPatternDifficulty);
router.get("/:pattern/learn", verifyAccessToken, getLearningPoints);
router.get(
  "/:pattern/recommended-questions-for-you",
  verifyAccessToken,
  getRecommendedProblems,
);
export default router;
