import axios from "axios";
import logger from "../../../../utils/logger.js";

const LEETCODE_GRAPHQL_API = "https://leetcode.com/graphql";

export const fetchLeetCodeContests = async () => {
  const query = `
    query {
      allContests {
        title
        titleSlug
        startTime
        duration
        originStartTime
        isVirtual
      }
    }
  `;

  const response = await axios.post(
    LEETCODE_GRAPHQL_API,
    {
      query,
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 15000,
    },
  );

  if (response.data.errors) {
    throw new Error(
      response.data.errors[0]?.message || "LeetCode API failed to provide data",
    );
  }

  const contests = response.data?.data?.allContests;

  if (!Array.isArray(contests)) {
    throw new Error("Invalid LeetCode contests response");
  }

  return contests;
};

export const normaliseLeetCodeContest = (contest) => {
  const startTime = new Date(contest.startTime * 1000);

  const endTime = new Date((contest.startTime + contest.duration) * 1000);

  return {
    platform: "LeetCode",

    externalId: contest.titleSlug,

    name: contest.title,

    startTime,

    endTime,

    duration: contest.duration,

    url: `https://leetcode.com/contest/${contest.titleSlug}/`,

    registrationUrl: `https://leetcode.com/contest/${contest.titleSlug}/`,

    phase:
      Date.now() < startTime.getTime()
        ? "BEFORE"
        : Date.now() < endTime.getTime()
          ? "CODING"
          : "FINISHED",

    type: contest.isVirtual ? "VIRTUAL" : "CONTEST",

    lastSyncedAt: new Date(),
  };
};

export const fetchLeetCodeUserContests = async (username) => {
  const query = `
    query userContestRankingInfo(
      $username: String!
    ) {

      userContestRanking(
        username: $username
      ) {
        attendedContestsCount
        rating
        globalRanking
        totalParticipants
        topPercentage
      }

      userContestRankingHistory(
        username: $username
      ) {
        attended
        trendDirection
        problemsSolved
        totalProblems
        finishTimeInSeconds
        rating
        ranking

        contest {
          title
          startTime
        }
      }
    }
  `;

  try {
    const response = await axios.post(
      LEETCODE_GRAPHQL_API,
      {
        query,

        variables: {
          username,
        },

        operationName: "userContestRankingInfo",
      },
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0",
        },

        timeout: 15000,
      },
    );

    if (response.data.errors) {
      logger.error("LeetCode GraphQL errors:", response.data.errors);

      throw new Error("LeetCode GraphQL API failed");
    }

    const data = response.data?.data;

    if (!data) {
      throw new Error("Invalid LeetCode response");
    }

    return {
      ranking: data.userContestRanking,

      history: data.userContestRankingHistory || [],
    };
  } catch (error) {
    logger.error("LeetCode provider error:", error.message);

    throw new Error("Failed to fetch LeetCode contest history");
  }
};
