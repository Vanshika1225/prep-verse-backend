import express from "express";
import { authenticateJWT } from "../../../middleware/auth.middleware.js";
import {
  getAllRandomProblem,
  getRecentActivity,
} from "./randomProblems.controller.js";

const router = express.Router();

router.get("/", authenticateJWT, getAllRandomProblem);
router.get("/recent-activity", authenticateJWT, getRecentActivity);

export default router;
