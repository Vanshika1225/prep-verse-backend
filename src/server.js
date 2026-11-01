import dotenv from "dotenv";
dotenv.config();

import connectDb from "./config/db.js";

import app from "./app.js";
import logger from "./utils/logger.js";
import { initJobSync } from "./modules/jobOpenings/job.cron.js";
import { startContestSyncJob } from "./jobs/contestSync.job.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDb();

  startContestSyncJob();
  await initJobSync();

  app.listen(PORT, () => {
    logger.info(`Server running on ${PORT}`);
  });
};

startServer();