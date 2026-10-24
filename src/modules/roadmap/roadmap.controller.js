import mongoose from "mongoose";
import { AUTH_MESSAGES } from "../../constants/messages.js";
import { httpStatusCodes } from "../../constants/statusCode.js";
import logger from "../../utils/logger.js";
import * as roadmapService from "./roadmap.service.js";

export const createRoadmap = async (req, res, next) => {
  try {
    const result = await roadmapService.createRoadmap(req);

    return res.status(httpStatusCodes.CREATED).json({
      success: true,
      message: "Roadmap created successfully.",
      data: result,
    });
  } catch (err) {
    logger.error("Create Roadmap Error:", err);
    next(err);
  }
};

export const getRoadmaps = async (req, res) => {
  try {
    const { tab = "all" } = req.query;

    if (!["all", "in-progress", "completed"].includes(tab)) {
      return res.status(httpStatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Tab must be all, in-progress or completed.",
      });
    }

    const roadmaps = await roadmapService.getRoadmaps(
      req.user.userId,
      req.query,
    );

    return res.status(httpStatusCodes.OK).json({
      success: true,
      message: "Roadmaps fetched successfully.",
      data: roadmaps,
    });
  } catch (err) {
    logger.error("Get Roadmaps Error:", err);
    return res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: AUTH_MESSAGES.INTERNAL_SERVER_ERROR_MESSAGE,
    });
  }
};

export const getRoadmapById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(httpStatusCodes.BAD_REQUEST).json({
        success: false,
        message: AUTH_MESSAGES.REQUIRED_VALID_ROADMAP_ID,
      });
    }

    const roadmap = await roadmapService.getRoadmapById(id, req.user.userId);

    if (!roadmap) {
      return res.status(httpStatusCodes.NOT_FOUND).json({
        success: false,
        message: AUTH_MESSAGES.ROADMAP_NOT_FOUND,
      });
    }

    return res.status(httpStatusCodes.OK).json({
      success: true,
      data: roadmap,
    });
  } catch (err) {
    logger.error("Get Roadmap Error:", err);
    return res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: AUTH_MESSAGES.INTERNAL_SERVER_ERROR_MESSAGE,
    });
  }
};

export const getOverallProgress = async (req, res) => {
  try {
    const progress = await roadmapService.getOverallProgress(req.user.userId);

    return res.status(httpStatusCodes.OK).json({
      success: true,
      data: progress,
    });
  } catch (err) {
    logger.error("Overall Progress Error:", err);
    return res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: AUTH_MESSAGES.INTERNAL_SERVER_ERROR_MESSAGE,
    });
  }
};

export const getRecommendedRoadmaps = async (req, res) => {
  try {
    const roadmaps = await roadmapService.getRecommendedRoadmaps(
      req.user.userId,
    );

    return res.status(httpStatusCodes.OK).json({
      success: true,
      data: roadmaps,
    });
  } catch (err) {
    logger.error("Recommended Roadmaps Error:", err);
    return res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: AUTH_MESSAGES.INTERNAL_SERVER_ERROR_MESSAGE,
    });
  }
};

export const getUpcomingMilestones = async (req, res) => {
  try {
    const milestones = await roadmapService.getUpcomingMilestones(
      req.user.userId,
    );

    return res.status(httpStatusCodes.OK).json({
      success: true,
      data: milestones,
    });
  } catch (err) {
    logger.error("Upcoming Milestones Error:", err);
    return res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: AUTH_MESSAGES.INTERNAL_SERVER_ERROR_MESSAGE,
    });
  }
};

export const startRoadmap = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(httpStatusCodes.BAD_REQUEST).json({
        success: false,
        message: AUTH_MESSAGES.REQUIRED_VALID_ROADMAP_ID,
      });
    }

    const roadmap = await roadmapService.startRoadmap(id, req.user.userId);

    if (!roadmap) {
      return res.status(httpStatusCodes.NOT_FOUND).json({
        success: false,
        message: AUTH_MESSAGES.ROADMAP_NOT_FOUND,
      });
    }

    return res.status(httpStatusCodes.OK).json({
      success: true,
      message: "Roadmap started successfully.",
      data: roadmap,
    });
  } catch (err) {
    logger.error("Start Roadmap Error:", err);
    return res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: AUTH_MESSAGES.INTERNAL_SERVER_ERROR_MESSAGE,
    });
  }
};

export const updateMilestoneStatus = async (req, res) => {
  try {
    const { id, milestoneId } = req.params;
    const { status } = req.body;

    if (
      !mongoose.isValidObjectId(id) ||
      !mongoose.isValidObjectId(milestoneId) ||
      !["Pending", "Completed"].includes(status)
    ) {
      return res.status(httpStatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Valid roadmap ID, milestone ID and status are required.",
      });
    }

    const roadmap = await roadmapService.updateMilestoneStatus(
      id,
      milestoneId,
      req.user.userId,
      status,
    );

    if (!roadmap) {
      return res.status(httpStatusCodes.NOT_FOUND).json({
        success: false,
        message: "Roadmap or milestone not found.",
      });
    }

    return res.status(httpStatusCodes.OK).json({
      success: true,
      message: "Milestone updated successfully.",
      data: roadmap,
    });
  } catch (err) {
    logger.error("Update Milestone Status Error:", err);

    if (err.status === 400) {
      return res.status(httpStatusCodes.BAD_REQUEST).json({
        success: false,
        message: err.message,
      });
    }

    return res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: AUTH_MESSAGES.INTERNAL_SERVER_ERROR_MESSAGE,
    });
  }
};

export const deleteRoadmap = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(httpStatusCodes.BAD_REQUEST).json({
        success: false,
        message: AUTH_MESSAGES.REQUIRED_VALID_ROADMAP_ID,
      });
    }

    const deleted = await roadmapService.deleteRoadmap(id, req.user.userId);

    if (!deleted) {
      return res.status(httpStatusCodes.NOT_FOUND).json({
        success: false,
        message: AUTH_MESSAGES.ROADMAP_NOT_FOUND,
      });
    }

    return res.status(httpStatusCodes.OK).json({
      success: true,
      message: "Roadmap deleted successfully.",
      data: deleted,
    });
  } catch (err) {
    logger.error("Delete Roadmap Error:", err);
    return res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: AUTH_MESSAGES.INTERNAL_SERVER_ERROR_MESSAGE,
    });
  }
};
