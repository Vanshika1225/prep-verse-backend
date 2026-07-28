import express from "express";
import {
  getAllPatterns,
  getLearningPoints,
  getPatternDifficulty,
  getRecommendedProblems,
} from "./patternWise.controller.js";
import { authenticateJWT } from "../../../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", authenticateJWT, getAllPatterns);
router.get("/:pattern/difficulty", authenticateJWT, getPatternDifficulty);
router.get("/:pattern/learn", authenticateJWT, getLearningPoints);
router.get(
  "/:pattern/recommended-questions-for-you",
  authenticateJWT,
  getRecommendedProblems,
);
export default router;
