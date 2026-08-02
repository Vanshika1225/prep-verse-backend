import "dotenv/config";

import {
  fetchCodeforcesContest,
  normaliseCodeforcesContest,
} from "./providers/codeforces.provider.js";

import {
  fetchCodeChefContest,
  normaliseCodeChefContest,
} from "./providers/codechef.provider.js";

import {
  fetchLeetCodeContests,
  normaliseLeetCodeContest,
} from "./providers/leetcode.provider.js";

import Contests from "./contests.model.js";
import connectDb from "../../../config/db.js";
import logger from "../../../utils/logger.js";

export const syncCodeForcesContests = async () => {
  logger.info("Fetching Codeforces Contests.....");

  const contests = await fetchCodeforcesContest();

  const operations = contests.map((contest) => {
    const normalized = normaliseCodeforcesContest(contest);

    return {
      updateOne: {
        filter: {
          platform: normalized.platform,
          externalId: normalized.externalId,
        },
        update: {
          $set: normalized,
        },
        upsert: true,
      },
    };
  });

  if (operations.length > 0) {
    await Contests.bulkWrite(operations);
  }

  const savedContests = await Contests.find()
    .sort({ startTime: 1 })
    .limit(5)
    .lean();

  logger.info(`Synced ${operations.length} Codeforces contests`);

  return operations.length;
};

export const syncCodeChefContests = async () => {
  try {
    logger.info("Fetching CodeChef contests...");

    const contests = await fetchCodeChefContest();

    const operations = contests?.present_contests?.map((contest) => {
      const normalised = normaliseCodeChefContest(contest);

      return {
        updateOne: {
          filter: {
            platform: normalised.platform,
            externalId: normalised.externalId,
          },

          update: {
            $set: normalised,
          },

          upsert: true,
        },
      };
    });

    if (operations.length > 0) {
      const result = await Contests.bulkWrite(operations);

      logger.info(
        `CodeChef synced: ${result.upsertedCount} inserted, ${result.modifiedCount} updated`,
      );
    }

    return {
      success: true,
      count: operations.length,
    };
  } catch (error) {
    logger.error("CodeChef sync failed:", error.message);

    return {
      success: false,
      count: 0,
      error: error.message,
    };
  }
};

export const syncLeetCodeContests = async () => {
  try {
    logger.info("Fetching LeetCode contests...");

    const contests = await fetchLeetCodeContests();

    const operations = contests.map((contest) => {
      const normalised = normaliseLeetCodeContest(contest);

      return {
        updateOne: {
          filter: {
            platform: normalised.platform,
            externalId: normalised.externalId,
          },

          update: {
            $set: normalised,
          },

          upsert: true,
        },
      };
    });

    if (operations.length > 0) {
      const result = await Contests.bulkWrite(operations);

      logger.info(
        `LeetCode synced: ${result.upsertedCount} inserted, ${result.modifiedCount} updated`,
      );
    }

    return {
      success: true,
      count: operations.length,
    };
  } catch (error) {
    logger.error("LeetCode sync failed:", error.message);

    return {
      success: false,
      count: 0,
      error: error.message,
    };
  }
};

export const syncAllContests = async () => {
  await connectDb();

  await syncCodeForcesContests();
  await syncCodeChefContests();
  await syncLeetCodeContests();
};

syncAllContests()
  .then(() => {
    logger.info("Sync completed");
  })
  .catch((error) => {
    logger.error("Sync failed:", error);
    process.exit(1);
  });
