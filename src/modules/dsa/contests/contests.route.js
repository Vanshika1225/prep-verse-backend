import express from "express";
import { authenticateJWT } from "../../../middleware/auth.middleware.js";
import {
  getLiveContestsController,
  getUpcomingContestsController,
} from "./contests.controller.js";

const router = express.Router();

router.get("/upcoming", authenticateJWT, getUpcomingContestsController);
router.get("/live", authenticateJWT, getLiveContestsController);

export default router;
