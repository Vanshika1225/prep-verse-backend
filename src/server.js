import dotenv from "dotenv";
dotenv.config();

import connectDb from "./config/db.js";

import app from "./app.js";
import logger from "./utils/logger.js";
import { startContestSyncJob } from "./jobs/contestSync.job.js";

connectDb();
startContestSyncJob();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`Server running on ${PORT}`);
});
