import express from "express";
import { authenticateJWT } from "../../../middleware/auth.middleware.js";
import {
  getCompletedContestsController,
  getLiveContestsController,
  getUpcomingContestsController,
} from "./contests.controller.js";

const router = express.Router();

router.get("/upcoming", authenticateJWT, getUpcomingContestsController);
router.get("/live", authenticateJWT, getLiveContestsController);
router.get("/completed", authenticateJWT, getCompletedContestsController);

export default router;
