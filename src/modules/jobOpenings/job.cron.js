import cron from "node-cron";
import logger from "../../utils/logger.js";
import { Job } from "./jobOpenings.model.js";
import { runJobSync } from "./jobSync.service.js";

export const initJobSync = async () => {
  if (process.env.JOBS_SYNC_ENABLED === "false") {
    logger.info("Job sync disabled.");
    return;
  }

  const schedule = process.env.JOBS_SYNC_CRON || "0 */12 * * *";

  if (!cron.validate(schedule)) {
    logger.error(`Invalid JOBS_SYNC_CRON: "${schedule}"`);
    return;
  }

  cron.schedule(schedule, () => {
    runJobSync().catch((err) => logger.error("Scheduled job sync failed:", err));
  });

  const count = await Job.estimatedDocumentCount();
  if (count === 0) {
    runJobSync().catch((err) => logger.error("Initial job sync failed:", err));
  }
};