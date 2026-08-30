import express from "express";
import { verifyAccessToken } from "../../middleware/auth.middleware.js";
import { getProfile, getStreak, updateProfile } from "./users.controller.js";

const router = express.Router();

router.get("/streak", verifyAccessToken, getStreak);
router.get("/profile", verifyAccessToken, getProfile);
router.put("/update-profile", verifyAccessToken, updateProfile);

export default router;
