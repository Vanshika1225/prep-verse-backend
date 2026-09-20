import { httpStatusCodes } from "../../../constants/statusCode.js";
import {
  allRandomProblemService,
  getRecentActivityService,
} from "./randomProblems.service.js";

export const getAllRandomProblem = async (req, res) => {
  try {
    const userId = req.user.userId;

    const difficulty = Array.isArray(req.query.difficulty)
      ? req.query.difficulty
      : req.query.difficulty
        ? [req.query.difficulty]
        : [];

    const topics = Array.isArray(req.query.topics)
      ? req.query.topics
      : req.query.topics
        ? [req.query.topics]
        : [];

    const count = Number(req.query.count) || 10;

    const excludeSolved = req.query.excludeSolved === "true";

    const bookmarkedOnly = req.query.bookmarkedOnly === "true";

    const problems = await allRandomProblemService({
      userId,
      difficulty,
      topics,
      count,
      excludeSolved,
      bookmarkedOnly,
    });

    return res.status(httpStatusCodes.OK).json({
      success: true,
      message: "Random Problems Set Generated Successfully.",
      data: problems,
    });
  } catch (error) {
    return res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};

export const getRecentActivity = async (req, res) => {
  try {
    const userId = req.user.userId;

    const recentActivity = await getRecentActivityService({ userId });

    res.status(httpStatusCodes.OK).json({
      succes: true,
      message: "recent Activity fetched successfully",
      data: recentActivity,
    });
  } catch (error) {
    res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};
