import mongoose from "mongoose";
import { AUTH_MESSAGES } from "../../constants/messages.js";
import { httpStatusCodes } from "../../constants/statusCode.js";
import logger from "../../utils/logger.js";
import * as jobTrackerService from "./jobTracker.service.js";

const INVALID_ID = "Valid application ID is required.";
const APP_NOT_FOUND = "Application not found.";

const handleError = (res, err, label) => {
  logger.error(`${label} Error:`, err);

  if (err.status) {
    return res.status(err.status).json({
      success: false,
      message: err.message,
    });
  }

  return res.status(httpStatusCodes.INTERNAL_SERVER_ERROR || 500).json({
    success: false,
    message: AUTH_MESSAGES?.INTERNAL_SERVER_ERROR_MESSAGE || "Internal server error.",
  });
};

export const getApplications = async (req, res) => {
  try {
    const result = await jobTrackerService.getApplications(req.user.userId, req.query);
    return res.status(httpStatusCodes.OK).json({
      success: true,
      message: "Applications fetched successfully.",
      data: result,
    });
  } catch (err) {
    return handleError(res, err, "Get Applications");
  }
};

export const getApplicationStats = async (req, res) => {
  try {
    const stats = await jobTrackerService.getApplicationStats(
      req.user.userId,
      req.query.timeRange
    );
    return res.status(httpStatusCodes.OK).json({
      success: true,
      data: stats,
    });
  } catch (err) {
    return handleError(res, err, "Application Stats");
  }
};

export const getUpcomingInterviews = async (req, res) => {
  try {
    const interviews = await jobTrackerService.getUpcomingInterviews(req.user.userId);
    return res.status(httpStatusCodes.OK).json({
      success: true,
      data: interviews,
    });
  } catch (err) {
    return handleError(res, err, "Upcoming Interviews");
  }
};

export const getRecentActivity = async (req, res) => {
  try {
    const activities = await jobTrackerService.getRecentActivity(
      req.user.userId,
      parseInt(req.query.limit, 10) || 10
    );
    return res.status(httpStatusCodes.OK).json({
      success: true,
      data: activities,
    });
  } catch (err) {
    return handleError(res, err, "Recent Activity");
  }
};

export const getFilterOptions = async (req, res) => {
  try {
    const filters = await jobTrackerService.getFilterOptions(req.user.userId);
    return res.status(httpStatusCodes.OK).json({
      success: true,
      data: filters,
    });
  } catch (err) {
    return handleError(res, err, "Tracker Filters");
  }
};

export const createApplication = async (req, res) => {
  try {
    const { company, role } = req.body;
    if (!company || !role) {
      return res.status(httpStatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Company and role are required.",
      });
    }

    const application = await jobTrackerService.createApplication(
      req.user.userId,
      req.body
    );

    return res.status(httpStatusCodes.CREATED || 201).json({
      success: true,
      message: "Application added successfully.",
      data: application,
    });
  } catch (err) {
    return handleError(res, err, "Create Application");
  }
};

export const getApplicationById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(httpStatusCodes.BAD_REQUEST).json({
        success: false,
        message: INVALID_ID,
      });
    }

    const application = await jobTrackerService.getApplicationById(id, req.user.userId);
    if (!application) {
      return res.status(httpStatusCodes.NOT_FOUND).json({
        success: false,
        message: APP_NOT_FOUND,
      });
    }

    return res.status(httpStatusCodes.OK).json({
      success: true,
      data: application,
    });
  } catch (err) {
    return handleError(res, err, "Get Application By Id");
  }
};

export const updateApplication = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(httpStatusCodes.BAD_REQUEST).json({
        success: false,
        message: INVALID_ID,
      });
    }

    const updated = await jobTrackerService.updateApplication(
      id,
      req.user.userId,
      req.body
    );

    if (!updated) {
      return res.status(httpStatusCodes.NOT_FOUND).json({
        success: false,
        message: APP_NOT_FOUND,
      });
    }

    return res.status(httpStatusCodes.OK).json({
      success: true,
      message: "Application updated successfully.",
      data: updated,
    });
  } catch (err) {
    return handleError(res, err, "Update Application");
  }
};

export const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, details } = req.body;

    if (!mongoose.isValidObjectId(id) || !status) {
      return res.status(httpStatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Valid ID and status are required.",
      });
    }

    const updated = await jobTrackerService.updateApplicationStatus(id, req.user.userId, {
      status,
      details,
    });

    if (!updated) {
      return res.status(httpStatusCodes.NOT_FOUND).json({
        success: false,
        message: APP_NOT_FOUND,
      });
    }

    return res.status(httpStatusCodes.OK).json({
      success: true,
      message: `Status updated to ${status}.`,
      data: updated,
    });
  } catch (err) {
    return handleError(res, err, "Update Application Status");
  }
};

export const deleteApplication = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(httpStatusCodes.BAD_REQUEST).json({
        success: false,
        message: INVALID_ID,
      });
    }

    const deleted = await jobTrackerService.deleteApplication(id, req.user.userId);
    if (!deleted) {
      return res.status(httpStatusCodes.NOT_FOUND).json({
        success: false,
        message: APP_NOT_FOUND,
      });
    }

    return res.status(httpStatusCodes.OK).json({
      success: true,
      message: "Application deleted successfully.",
    });
  } catch (err) {
    return handleError(res, err, "Delete Application");
  }
};