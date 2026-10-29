import express from "express";

import { verifyAccessToken } from "../../../middleware/auth.middleware.js";

import {
  getCompletedContestsController,
  getLiveContestsController,
  getUpcomingContestsController,
  getContestAnalyticsController,
  syncUserContestsController,
  syncContestsController,
} from "./contests.controller.js";

const router = express.Router();

router.get("/upcoming", verifyAccessToken, getUpcomingContestsController);
router.get("/live", verifyAccessToken, getLiveContestsController);
router.get("/completed", verifyAccessToken, getCompletedContestsController);
router.get("/analytics", verifyAccessToken, getContestAnalyticsController);
router.post("/sync/user", verifyAccessToken, syncUserContestsController);
router.post("/sync", verifyAccessToken, syncContestsController);

export default router;
