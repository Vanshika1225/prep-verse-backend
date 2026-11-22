import { AUTH_MESSAGES } from "../../constants/messages.js";
import { httpStatusCodes } from "../../constants/statusCode.js";
import logger from "../../utils/logger.js";
import * as dashboardService from "./dashboard.service.js";

const handleError = (res, err, label) => {
  logger.error(`${label} Error:`, err);

  if (err.status || err.statusCode) {
    return res.status(err.status || err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  return res.status(httpStatusCodes.INTERNAL_SERVER_ERROR || 500).json({
    success: false,
    message: AUTH_MESSAGES?.INTERNAL_SERVER_ERROR_MESSAGE || "Internal server error.",
  });
};

export const getDashboardSummary = async (req, res) => {
  try {
    const summary = await dashboardService.getDashboardSummary(req.user.userId);
    return res.status(httpStatusCodes.OK).json({
      success: true,
      message: "Dashboard summary fetched successfully.",
      data: summary,
    });
  } catch (err) {
    return handleError(res, err, "Get Dashboard Summary");
  }
};

export const getDisciplineScore = async (req, res) => {
  try {
    const disciplineScore = await dashboardService.getDisciplineScore(req.user.userId);
    return res.status(httpStatusCodes.OK).json({
      success: true,
      message: "Discipline score fetched successfully.",
      data: disciplineScore,
    });
  } catch (err) {
    return handleError(res, err, "Get Discipline Score");
  }
};

export const getWeeklyActivity = async (req, res) => {
  try {
    const range = req.query.range || "week";
    const activity = await dashboardService.getWeeklyActivity(req.user.userId, range);
    return res.status(httpStatusCodes.OK).json({
      success: true,
      message: "Weekly activity fetched successfully.",
      data: activity,
    });
  } catch (err) {
    return handleError(res, err, "Get Weekly Activity");
  }
};
