import logger from "../../../utils/logger.js";
import { getLiveContests, getUpcommingContests } from "./contests.service.js";

export const getUpcomingContestsController = async (req, res) => {
  try {
    const { platform, limit = 10 } = req.query;

    const contests = await getUpcommingContests({
      platform,
      limit,
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
    const { platform, limit = 10 } = req.query;

    const contests = await getLiveContests({
      platform,
      limit,
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
