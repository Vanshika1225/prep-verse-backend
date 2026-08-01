import "dotenv/config";

import {
  fetchCodeforcesContest,
  normaliseCodeforcesContest,
} from "./providers/codeforces.provider.js";

import Contests from "./contests.model.js";
import connectDb from "../../../config/db.js";

export const syncCodeForcesContests = async () => {
  console.log("Fetching Codeforces Contests.....");

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

  console.log(`Synced ${operations.length} Codeforces contests`);

  return operations.length;
};

export const syncAllContests = async () => {
  await connectDb();

  await syncCodeForcesContests();
};

syncAllContests()
  .then(() => {
    console.log("Sync completed");
  })
  .catch((error) => {
    console.error("Sync failed:", error);
    process.exit(1);
  });
