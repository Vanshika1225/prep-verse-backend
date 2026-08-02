import axios from "axios";
const LEETCODE_API = "https://leetcode.com/graphql";

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
    LEETCODE_API,
    {
      query,
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  if (response.data.errors) {
    throw new Error(
      response.data.errors[0]?.message ||
        "LeetCode API Failed To Provide Data!",
    );
  }

  const contests =
    response.data?.data?.allContests;

  if (!Array.isArray(contests)) {
    throw new Error(
      "Invalid LeetCode contests response",
    );
  }

  return contests;
};

export const normaliseLeetCodeContest = (
  contest,
) => {
  const startTime = new Date(
    contest.startTime * 1000,
  );

  const endTime = new Date(
    (contest.startTime + contest.duration) * 1000,
  );

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

    type: contest.isVirtual
      ? "VIRTUAL"
      : "CONTEST",

    lastSyncedAt: new Date(),
  };
};