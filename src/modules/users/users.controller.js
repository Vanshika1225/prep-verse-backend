import { httpStatusCodes } from "../../constants/statusCode.js";
import logger from "../../utils/logger.js";
import { getStreakService } from "./users.service.js";


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
