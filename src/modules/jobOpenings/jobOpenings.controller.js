import mongoose from "mongoose";
import { AUTH_MESSAGES } from "../../constants/messages.js";
import { httpStatusCodes } from "../../constants/statusCode.js";
import logger from "../../utils/logger.js";
import * as jobService from "./jobOpenings.service.js";

const INVALID_JOB_ID = "Valid job ID is required.";
const JOB_NOT_FOUND = "Job not found.";

const handleError = (res, err, label) => {
  logger.error(`${label} Error:`, err);

  if (err.status) {
    return res.status(err.status).json({
      success: false,
      message: err.message,
    });
  }

  return res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: AUTH_MESSAGES.INTERNAL_SERVER_ERROR_MESSAGE,
  });
};

export const getJobs = async (req, res) => {
  try {
    const result = await jobService.getJobs(req.user.userId, req.query);

    return res.status(httpStatusCodes.OK).json({
      success: true,
      message: "Jobs fetched successfully.",
      data: result,
    });
  } catch (err) {
    return handleError(res, err, "Get Jobs");
  }
};

export const getJobById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(httpStatusCodes.BAD_REQUEST).json({
        success: false,
        message: INVALID_JOB_ID,
      });
    }

    const job = await jobService.getJobById(id, req.user.userId);

    if (!job) {
      return res.status(httpStatusCodes.NOT_FOUND).json({
        success: false,
        message: JOB_NOT_FOUND,
      });
    }

    return res.status(httpStatusCodes.OK).json({ success: true, data: job });
  } catch (err) {
    return handleError(res, err, "Get Job");
  }
};

export const getRecommendedJobs = async (req, res) => {
  try {
    const jobs = await jobService.getRecommendedJobs(req.user.userId);
    return res.status(httpStatusCodes.OK).json({ success: true, data: jobs });
  } catch (err) {
    return handleError(res, err, "Recommended Jobs");
  }
};

export const getTopCompanies = async (req, res) => {
  try {
    const companies = await jobService.getTopCompanies();
    return res
      .status(httpStatusCodes.OK)
      .json({ success: true, data: companies });
  } catch (err) {
    return handleError(res, err, "Top Companies");
  }
};

export const getPopularSkills = async (req, res) => {
  try {
    const skills = await jobService.getPopularSkills();
    return res.status(httpStatusCodes.OK).json({ success: true, data: skills });
  } catch (err) {
    return handleError(res, err, "Popular Skills");
  }
};

export const getFilterOptions = async (req, res) => {
  try {
    const options = await jobService.getFilterOptions();
    return res
      .status(httpStatusCodes.OK)
      .json({ success: true, data: options });
  } catch (err) {
    return handleError(res, err, "Filter Options");
  }
};

export const startApply = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(httpStatusCodes.BAD_REQUEST).json({
        success: false,
        message: INVALID_JOB_ID,
      });
    }

    const result = await jobService.startApply(id, req.user.userId);

    if (!result) {
      return res.status(httpStatusCodes.NOT_FOUND).json({
        success: false,
        message: JOB_NOT_FOUND,
      });
    }

    return res.status(httpStatusCodes.OK).json({
      success: true,
      message: "Redirect to the application page.",
      data: result,
    });
  } catch (err) {
    return handleError(res, err, "Start Apply");
  }
};

export const getPendingApplications = async (req, res) => {
  try {
    const pending = await jobService.getPendingApplications(req.user.userId);
    return res
      .status(httpStatusCodes.OK)
      .json({ success: true, data: pending });
  } catch (err) {
    return handleError(res, err, "Pending Applications");
  }
};

export const confirmApply = async (req, res) => {
  try {
    const { id } = req.params;
    const { applied } = req.body;

    if (!mongoose.isValidObjectId(id) || typeof applied !== "boolean") {
      return res.status(httpStatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Valid job ID and applied (true/false) are required.",
      });
    }

    const result = await jobService.confirmApply(id, req.user.userId, applied);

    if (!result) {
      return res.status(httpStatusCodes.NOT_FOUND).json({
        success: false,
        message: "No pending application found for this job.",
      });
    }

    return res.status(httpStatusCodes.OK).json({
      success: true,
      message: applied
        ? "Application marked as applied."
        : "Okay, we won't track this job.",
      data: result,
    });
  } catch (err) {
    return handleError(res, err, "Confirm Apply");
  }
};
