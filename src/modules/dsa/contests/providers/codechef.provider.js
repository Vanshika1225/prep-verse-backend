import axios from "axios";

const CODECHEF_API = "https://www.codechef.com/api/list/contests/all";

export const fetchCodeChefContest = async () => {
  const response = await axios.get(CODECHEF_API);

  if (!response.data) {
    throw new Error("CodeChef API Failed To Provide Data!");
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
