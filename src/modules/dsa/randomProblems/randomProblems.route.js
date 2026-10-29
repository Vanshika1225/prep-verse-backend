import express from "express";
import { verifyAccessToken } from "../../../middleware/auth.middleware.js";
import {
  getAllRandomProblem,
  getRecentActivity,
} from "./randomProblems.controller.js";

const router = express.Router();

router.get("/", verifyAccessToken, getAllRandomProblem);
router.get("/recent-activity", verifyAccessToken, getRecentActivity);

export default router;
