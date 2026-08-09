import axios from "axios";

const CODECHEF_API = "https://www.codechef.com/api/list/contests/all";

export const fetchCodeChefContests = async () => {
  const response = await axios.get(CODECHEF_API, {
    timeout: 15000,
  });

  if (!response.data) {
    throw new Error("CodeChef API failed to provide data");
  }

  return response.data;
};

export const normaliseCodeChefContest = (contest) => {
  const startTime = new Date(contest.contest_start_date_iso);

  const endTime = new Date(contest.contest_end_date_iso);

  return {
    platform: "CodeChef",

    externalId: contest.contest_code,

    name: contest.contest_name,

    startTime,

    endTime,

    duration: (endTime.getTime() - startTime.getTime()) / 1000,

    url: `https://www.codechef.com/contests/${contest.contest_code}`,

    registrationUrl: `https://www.codechef.com/contests/${contest.contest_code}`,

    phase: "BEFORE",

    type: "CONTEST",

    lastSyncedAt: new Date(),
  };
};

export const fetchCodeChefUserContests = async (handle) => {
  throw new Error(
    "CodeChef user contest history provider is not configured yet",
  );
};
