import jwt from "jsonwebtoken";
import logger from "../utils/logger.js";

export const authenticateJWT = (req, res, next) => {
  try {
    logger.info("JWT authentication started");

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logger.warn("Authorization token missing");

      return res.status(401).json({
        message: "Access denied. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

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
      message: "Invalid or expired token.",
    });
  }
};
