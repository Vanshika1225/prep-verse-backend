import logger from "../../../utils/logger.js";
import {
  getCompletedContestsService,
  getLiveContests,
  getUpcommingContests,
} from "./contests.service.js";

export const getUpcomingContestsController = async (req, res) => {
  try {
    const { platform, limit = 10, search } = req.query;

    const contests = await getUpcommingContests({
      platform,
      limit,
      search,
    });

    res.status(200).json({
      success: true,
      count: contests.length,
      contests,
    });
  } catch (error) {
    logger.error("Get upcoming contests error:", error);

    res.status(500).json({
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

    res.status(200).json({
      success: true,
      count: contests.length,
      contests,
    });
  } catch (error) {
    logger.error("Get live contests error:", error);

    res.status(500).json({
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

    return res.status(200).json({
      success: true,
      message: "Completed contests fetched successfully",

      data: result,
    });
  } catch (error) {
    logger.error("Get completed contests error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch completed contests",
    });
  }
};
