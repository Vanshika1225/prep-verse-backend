import { AUTH_MESSAGES } from "../../constants/messages.js";
import { httpStatusCodes } from "../../constants/statusCode.js";
import logger from "../../utils/logger.js";
import * as studyPlannerService from "./studyPlanner.service.js";

export const createPlan = async (req, res, next) => {
  try {
    const result = await studyPlannerService.createPlan(req);

    return res.status(httpStatusCodes.CREATED).json({
      success: true,
      message: "Study plan created successfully.",
      data: result,
    });
  } catch (err) {
    logger.error("Create Plan Error:", err);
    next(err);
  }
};

export const getPlans = async (req, res) => {
  try {
    const plans = await studyPlannerService.getPlans(req.user.userId);

    return res.status(httpStatusCodes.OK).json({
      success: true,
      message: "Plans fetched successfully.",
      data: plans,
    });
  } catch (err) {
    logger.error("Get Plans Error:", err);
    return res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err.message,
    });
  }
};

export const getWeeklySchedule = async (req, res) => {
  try {
    const schedule = await studyPlannerService.getWeeklySchedule(
      req.user.userId,
      req.query.weekStart,
    );

    return res.status(httpStatusCodes.OK).json({
      success: true,
      data: schedule,
    });
  } catch (err) {
    logger.error("Weekly Schedule Error:", err);
    return res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: AUTH_MESSAGES.INTERNAL_SERVER_ERROR_MESSAGE,
    });
  }
};

export const getStats = async (req, res) => {
  try {
    const stats = await studyPlannerService.getStats(req.user.userId);

    return res.status(httpStatusCodes.OK).json({
      success: true,
      data: stats,
    });
  } catch (err) {
    logger.error("Get Stats Error:", err);
    return res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: AUTH_MESSAGES.INTERNAL_SERVER_ERROR_MESSAGE,
    });
  }
};

export const getTodayFocus = async (req, res) => {
  try {
    const tasks = await studyPlannerService.getTodayFocus(req.user.userId);

    return res.status(httpStatusCodes.OK).json({
      success: true,
      data: tasks,
    });
  } catch (err) {
    logger.error("Today Focus Error:", err);
    return res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: AUTH_MESSAGES.INTERNAL_SERVER_ERROR_MESSAGE,
    });
  }
};

export const updateTaskStatus = async (req, res, next) => {
  try {
    const task = await studyPlannerService.updateTaskStatus(
      req.params.taskId,
      req.user.userId,
      req.body,
    );

    return res.status(httpStatusCodes.OK).json({
      success: true,
      message: "Task updated successfully.",
      data: task,
    });
  } catch (err) {
    logger.error("Update Task Error:", err);
    next(err);
  }
};
