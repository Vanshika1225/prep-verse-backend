import { httpStatusCodes } from "../../../constants/statusCode.js";
import logger from "../../../utils/logger.js";
import * as problemService from "./allProblems.service.js";

export const getProblems = async (req, res) => {
  try {
    const result = await problemService.getAllProblems(req);

    return res.status(httpStatusCodes.OK).json({
      success: true,
      message: "Problems fetched successfully.",
      data: result,
    });
  } catch (err) {
    logger.error("get Problem Error:", err);
    return res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err.message,
    });
  }
};

export const updateUserProblem = async (req, res, next) => {
  try {
    const data = await problemService.updateUserProblem(req);

    res.status(200).json({
      message: "Progress Updated Successfully",
      data,
    });
  } catch (err) {
    logger.error("Update User Problem Error:", err);
    next(err);
  }
};

export const getOverview = async (req, res) => {
  try {
    const overview = await problemService.getOverviewCounts(req.user.userId);

    return res.status(200).json({
      success: true,
      data: overview,
    });
  } catch (error) {
    logger.error("Overview Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const getRecentProblemsController = async (req, res) => {
  try {
    const recentProblems = await problemService.getRecentProblems(
      req.user.userId,
    );

    return res.status(200).json({
      success: true,
      data: recentProblems,
    });
  } catch (error) {
    logger.error("Recent Problems Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const getTopicBreakdownController = async (req, res) => {
  try {
    const topicBreakdown = await problemService.getTopicBreakdown(
      req.user.userId,
    );

    return res.status(200).json({
      success: true,
      data: topicBreakdown,
    });
  } catch (error) {
    logger.error("Topic Breakdown Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
