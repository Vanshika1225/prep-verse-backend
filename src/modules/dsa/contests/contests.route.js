import express from "express";

import { authenticateJWT } from "../../../middleware/auth.middleware.js";

import {
  getCompletedContestsController,
  getLiveContestsController,
  getUpcomingContestsController,
  getContestAnalyticsController,
  syncUserContestsController,
  syncContestsController,
} from "./contests.controller.js";

const router = express.Router();

router.get("/upcoming", authenticateJWT, getUpcomingContestsController);
router.get("/live", authenticateJWT, getLiveContestsController);
router.get("/completed", authenticateJWT, getCompletedContestsController);
router.get("/analytics", authenticateJWT, getContestAnalyticsController);
router.post("/sync/user", authenticateJWT, syncUserContestsController);
router.post("/sync", authenticateJWT, syncContestsController);

export default router;
