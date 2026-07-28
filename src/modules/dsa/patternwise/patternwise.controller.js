import { httpStatusCodes } from "../../../constants/statusCode.js";
import logger from "../../../utils/logger.js";
import { getAllPatternsService, getLearningPointsService, getPatternDifficultyService, getRecommendedProblemsService } from "./patternWise.service.js";

export const getAllPatterns = async (req, res) => {
  try {
    const data = await getAllPatternsService(req.user.userId);

    return res.status(httpStatusCodes.OK).json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error(error);

    return res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};

export const getPatternDifficulty = async (req, res) => {
  try {
    const { pattern } = req.params;

    const data = await getPatternDifficultyService(
      req.user.userId,
      decodeURIComponent(pattern)
    );

    return res.status(httpStatusCodes.OK).json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error(error);

    return res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};


export const getLearningPoints = async (req, res) => {
  try {
    const data = await getLearningPointsService(req.params.pattern);

    return res.status(httpStatusCodes.OK).json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error(error);

    return res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};

export const getRecommendedProblems = async (req, res) => {
  try {
    const { pattern } = req.params;

    const data = await getRecommendedProblemsService(
      req.user.userId,
      decodeURIComponent(pattern)
    );

    return res.status(httpStatusCodes.OK).json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error(error);

    return res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};