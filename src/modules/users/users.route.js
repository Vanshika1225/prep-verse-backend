import express from "express";
import { authenticateJWT } from "../../middleware/auth.middleware.js";
import { getProfile, getStreak, updateProfile } from "./users.controller.js";

const router = express.Router();

router.get("/streak", authenticateJWT, getStreak);
router.get("/profile", authenticateJWT, getProfile);
router.put("/update-profile", authenticateJWT, updateProfile);

export default router;
