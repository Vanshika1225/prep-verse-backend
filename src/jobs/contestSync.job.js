import cron from "node-cron";

import {
  syncAllContests,
  syncAllUserContests,
} from "../modules/dsa/contests/contests.sync.js";

import logger from "../utils/logger.js";
import { UserProfile } from "../modules/users/users.model.js";

export const startContestSyncJob = () => {
  cron.schedule("*/45 * * * *", async () => {
    logger.info("Starting contest sync...");

    try {
      const globalResult = await syncAllContests();

      logger.info(`Global contest sync: ${JSON.stringify(globalResult)}`);

      const profiles = await UserProfile.find({
        $or: [
          { codeforcesHandle: { $exists: true, $nin: [null, ""] } },
          { leetcodeHandle: { $exists: true, $nin: [null, ""] } },
          { codechefHandle: { $exists: true, $nin: [null, ""] } },
        ],
      }).select("userId");

      for (const profile of profiles) {
        try {
          const result = await syncAllUserContests(profile.userId);

          logger.info(
            `User ${profile.userId} contest sync: ${JSON.stringify(result)}`,
          );
        } catch (error) {
          logger.error(`User ${profile.userId} sync failed: ${error.message}`);
        }
      }

      logger.info("Contest sync completed successfully.");
    } catch (error) {
      logger.error(`Contest sync failed: ${error.message}`);
    }
  });

  logger.info("Contest sync cron job started.");
};
