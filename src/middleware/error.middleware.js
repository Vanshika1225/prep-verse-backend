import { AUTH_MESSAGES } from "../constants/messages.js";
import logger from "../utils/logger.js";

const errorHandler = (err, req, res, next) => {
  logger.error(err);
  res.status(err.statusCode || 500).json({
    succes: false,
    message: err.message || AUTH_MESSAGES.INTERNAL_SERVER_ERROR_MESSAGE,
  });
};

export default errorHandler;
