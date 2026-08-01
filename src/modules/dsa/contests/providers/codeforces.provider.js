import axios from "axios";

const CODEFORCES_API = "https://codeforces.com/api/contest.list";

export const fetchCodeforcesContest = async () => {
  const resposne = await axios.get(CODEFORCES_API);

  if (resposne.data.status !== "OK") {
    throw new Error(
      resposne.data.comment || "Codeforces Api Failed To Provide Data!",
    );
  }

  return resposne.data.result;
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

