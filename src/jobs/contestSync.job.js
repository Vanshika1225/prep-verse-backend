import cron from "node-cron";
import { syncAllContests } from "../modules/dsa/contests/contests.sync.js";

export const startContestSyncJob = () => {
  cron.schedule("*/45 * * * *", async () => {
    console.log("Running scheduled contest sync...");

    try {
      await syncAllContests();

      console.log("Scheduled contest sync completed");
    } catch (error) {
      console.error("Scheduled contest sync failed:", error.message);
    }
  });
};
