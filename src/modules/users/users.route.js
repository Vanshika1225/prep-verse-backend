import express from "express";
import { authenticateJWT } from "../../middleware/auth.middleware.js";
import { getStreak } from "./users.controller.js";


const router = express.Router();

router.get("/streak", authenticateJWT, getStreak);

export default router;
