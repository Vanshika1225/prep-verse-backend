import jwt from "jsonwebtoken";
import logger from "../utils/logger.js";

export const verifyAccessToken = (req, res, next) => {
  try {
    logger.info("JWT authentication started");

    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      logger.warn("Authorization token missing");

      return res.status(401).json({
        success: false,
        message: "Access token missing",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET
    );

    logger.info("JWT verified", {
      userId: decoded.userId,
    });

    req.user = decoded;

    next();
  } catch (error) {
    logger.error("JWT verification failed", {
      error: error.message,
    });

    return res.status(401).json({
      success: false,
      message: "Access token expired or invalid",
    });
  }
};