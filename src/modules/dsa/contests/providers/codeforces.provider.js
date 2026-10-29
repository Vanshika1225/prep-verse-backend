import axios from "axios";
import logger from "../../../../utils/logger.js";

const CODEFORCES_API = "https://codeforces.com/api";

export const fetchCodeforcesContests = async () => {
  const response = await axios.get(`${CODEFORCES_API}/contest.list`, {
    timeout: 15000,
  });

  if (response.data.status !== "OK") {
    throw new Error(
      response.data.comment || "Codeforces API failed to provide data",
    );
  }

  return response.data.result;
};

export const normaliseCodeforcesContest = (contest) => {
  const startTime = new Date(contest.startTimeSeconds * 1000);

  const endTime = new Date(
    (contest.startTimeSeconds + contest.durationSeconds) * 1000,
  );

  return {
    platform: "Codeforces",
    externalId: String(contest.id),
    name: contest.name,
    startTime,
    endTime,
    duration: contest.durationSeconds,
    url: `https://codeforces.com/contest/${contest.id}`,
    registrationUrl: `https://codeforces.com/contestRegistration/${contest.id}`,
    phase: contest.phase,
    type: contest.type,
    lastSyncedAt: new Date(),
  };
};

export const fetchCodeforcesUserContests = async (handle) => {
  try {
    const response = await axios.get(`${CODEFORCES_API}/user.rating`, {
      params: {
        handle,
      },
      timeout: 10000,
    });

    if (response.data.status !== "OK") {
      throw new Error(
        response.data.comment || "Codeforces user rating API failed",
      );
    }

    return response.data.result;
  } catch (error) {
    logger.error("Codeforces provider error:", error.message);

    throw new Error("Failed to fetch Codeforces contest history");
  }
};
