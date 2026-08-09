import { httpStatusCodes } from "../../constants/statusCode.js";
import logger from "../../utils/logger.js";
import User from "../auth/auth.model.js";
import { UserProfile } from "./users.model.js";
import {
  getProfileService,
  getStreakService,
  updateProfileService,
} from "./users.service.js";

export const getProfile = async (req, res) => {
  try {
    const result = await getProfileService(req.user.userId);

    return res.status(httpStatusCodes.OK).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error("Get Profile Error:", error);

    return res
      .status(error.statusCode || httpStatusCodes.INTERNAL_SERVER_ERROR)
      .json({
        success: false,
        message: error.message || "Failed to fetch profile",
      });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const result = await updateProfileService(req.user.userId, req.body);

    return res.status(httpStatusCodes.OK).json({
      success: true,
      message: "Profile updated successfully",
      data: result,
    });
  } catch (error) {
    logger.error("Update Profile Error:", error);

    return res
      .status(error.statusCode || httpStatusCodes.INTERNAL_SERVER_ERROR)
      .json({
        success: false,
        message: error.message || "Failed to update profile",
      });
  }
};

export const getStreak = async (req, res) => {
  try {
    const result = await getStreakService(req.user.userId);

    return res.status(httpStatusCodes.OK).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error("Get Streak Error:", error);

    return res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch streak",
    });
  }
};
