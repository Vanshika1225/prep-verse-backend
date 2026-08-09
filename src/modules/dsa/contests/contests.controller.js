import { httpStatusCodes } from "../../../constants/statusCode.js";
import logger from "../../../utils/logger.js";

import {
  getCompletedContestsService,
  getLiveContests,
  getUpcommingContests,
  getContestAnalytics,
} from "./contests.service.js";

import { syncAllContests } from "./contests.sync.js";

export const getUpcomingContestsController = async (req, res) => {
  try {
    const { platform, limit = 10, search } = req.query;

    const contests = await getUpcommingContests({
      platform,
      limit,
      search,
    });

    return res.status(httpStatusCodes.OK).json({
      success: true,
      count: contests.length,
      contests,
    });
  } catch (error) {
    logger.error("Get upcoming contests error:", error);

    return res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch upcoming contests",
    });
  }
};

export const getLiveContestsController = async (req, res) => {
  try {
    const { platform, limit = 10, search } = req.query;

    const contests = await getLiveContests({
      platform,
      limit,
      search,
    });

    return res.status(httpStatusCodes.OK).json({
      success: true,
      count: contests.length,
      contests,
    });
  } catch (error) {
    logger.error("Get live contests error:", error);

    return res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch live contests",
    });
  }
};

export const getCompletedContestsController = async (req, res) => {
  try {
    const { page = 1, limit = 10, platform, search } = req.query;

    const result = await getCompletedContestsService({
      page,
      limit,
      platform,
      search,
    });

    return res.status(httpStatusCodes.OK).json({
      success: true,

      message: "Completed contests fetched successfully",

      data: result,
    });
  } catch (error) {
    logger.error("Get completed contests error:", error);

    return res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch completed contests",
    });
  }
};

export const getContestAnalyticsController = async (req, res) => {
  try {
    const userId = req.user.userId;

    const { period = "month", platform = "all" } = req.query;

    const analytics = await getContestAnalytics({
      userId,
      period,
      platform,
    });

    return res.status(httpStatusCodes.OK).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error("Contest analytics error:", error);

    return res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Failed to fetch contest analytics",
    });
  }
};

export const syncUserContestsController = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await syncAllUserContests(userId);

    return res.status(httpStatusCodes.OK).json({
      success: true,

      message: "User contest history synced",

      data: result,
    });
  } catch (error) {
    logger.error("User contest sync error:", error);

    return res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Failed to sync user contests",
    });
  }
};

export const syncContestsController = async (req, res) => {
  try {
    const result = await syncAllContests();

    return res.status(httpStatusCodes.OK).json({
      success: true,

      message: "All platform contests synced",

      data: result,
    });
  } catch (error) {
    logger.error("Contest sync error:", error);

    return res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Failed to sync contests",
    });
  }
};
