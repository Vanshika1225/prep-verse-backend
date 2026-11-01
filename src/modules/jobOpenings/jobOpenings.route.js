import express from "express";
import {
  getJobs,
  getJobById,
  getRecommendedJobs,
  getTopCompanies,
  getPopularSkills,
  getFilterOptions,
  startApply,
  getPendingApplications,
  confirmApply,
} from "./jobOpenings.controller.js";
import { verifyAccessToken } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", verifyAccessToken, getJobs);
router.get("/recommended", verifyAccessToken, getRecommendedJobs);
router.get("/top-companies", verifyAccessToken, getTopCompanies);
router.get("/popular-skills", verifyAccessToken, getPopularSkills);
router.get("/filters", verifyAccessToken, getFilterOptions);
router.get("/pending-applications", verifyAccessToken, getPendingApplications);

router.get("/:id", verifyAccessToken, getJobById);
router.post("/:id/apply", verifyAccessToken, startApply);
router.post("/:id/confirm-apply", verifyAccessToken, confirmApply);

export default router;