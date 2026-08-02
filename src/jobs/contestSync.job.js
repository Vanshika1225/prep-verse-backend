import cron from "node-cron";
import { syncAllContests } from "../modules/dsa/contests/contests.sync.js";
import logger from "../utils/logger.js";

export const startContestSyncJob = () => {
  cron.schedule("*/45 * * * *", async () => {
    logger.log("Running scheduled contest sync...");

    try {
      await syncAllContests();

      logger.log("Scheduled contest sync completed");
    } catch (error) {
      logger.error("Scheduled contest sync failed:", error.message);
    }
  });
};
