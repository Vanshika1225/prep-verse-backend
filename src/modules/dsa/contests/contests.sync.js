import { fetchCodeforcesContests } from "./providers/codeforces.provider.js";

import { fetchCodeChefContests } from "./providers/codechef.provider.js";

import { fetchLeetCodeContests } from "./providers/leetcode.provider.js";

import Contest from "./contests.model.js";

export const syncLeetCodeUserContests = async (userId) => {
  const profile = await UserProfile.findOne({
    userId,
  });

  if (!profile) {
    throw new Error("User profile not found");
  }

  const handle = profile.leetcodeHandle;

  if (!handle) {
    throw new Error("LeetCode handle not connected");
  }

  const result = await fetchLeetCodeUserContests(handle);

  const history = result.history;

  let synced = 0;

  for (let i = 0; i < history.length; i++) {
    const contest = history[i];

    if (!contest.attended) {
      continue;
    }

    const contestTitle = contest.contest?.title;

    const startTime = contest.contest?.startTime;

    if (!contestTitle || !startTime) {
      continue;
    }

    const externalId = `${contestTitle}-${startTime}`;

    const dbContest = await Contest.findOne({
      platform: "LeetCode",
      externalId,
    });

    if (!dbContest) {
      console.log(`LeetCode contest not found: ${contestTitle}`);

      continue;
    }

    let ratingBefore = null;

    if (i > 0) {
      const previous = history[i - 1];

      if (previous.attended && previous.rating != null) {
        ratingBefore = previous.rating;
      }
    }

    const ratingAfter = contest.rating ?? null;

    let ratingChange = null;

    if (ratingBefore != null && ratingAfter != null) {
      ratingChange = ratingAfter - ratingBefore;
    }

    await saveUserContest({
      userId,

      contestId: dbContest._id,

      platform: "LeetCode",

      externalId,

      participated: true,

      rank: contest.ranking ?? null,

      ratingBefore,

      ratingAfter,

      ratingChange,

      attendedAt: new Date(startTime * 1000),
    });

    synced++;
  }

  return {
    platform: "LeetCode",
    handle,
    total: history.length,
    synced,
  };
};

export const syncCodeChefUserContests = async (userId) => {
  const profile = await UserProfile.findOne({
    userId,
  });

  if (!profile) {
    throw new Error("User profile not found");
  }

  const handle = profile.codechefHandle;

  if (!handle) {
    throw new Error("CodeChef handle not connected");
  }

  const contests = await fetchCodeChefUserContests(handle);

  let synced = 0;

  for (const contest of contests) {
    const dbContest = await Contest.findOne({
      platform: "CodeChef",

      externalId: String(contest.externalId),
    });

    if (!dbContest) {
      continue;
    }

    await saveUserContest({
      userId,

      contestId: dbContest._id,

      platform: "CodeChef",

      externalId: String(contest.externalId),

      participated: true,

      rank: contest.rank ?? null,

      ratingBefore: contest.ratingBefore ?? null,

      ratingAfter: contest.ratingAfter ?? null,

      ratingChange: contest.ratingChange ?? null,

      attendedAt: contest.attendedAt ? new Date(contest.attendedAt) : null,
    });

    synced++;
  }

  return {
    platform: "CodeChef",
    handle,
    total: contests.length,
    synced,
  };
};

export const syncCodeforcesContests = async () => {
  const contests = await fetchCodeforcesContests();

  let synced = 0;

  for (const contest of contests) {
    if (!contest.startTimeSeconds || !contest.durationSeconds) {
      continue;
    }

    const startTime = new Date(contest.startTimeSeconds * 1000);

    const endTime = new Date(
      (contest.startTimeSeconds + contest.durationSeconds) * 1000,
    );

    await Contest.findOneAndUpdate(
      {
        platform: "Codeforces",

        externalId: String(contest.id),
      },

      {
        platform: "Codeforces",

        externalId: String(contest.id),

        name: contest.name,

        startTime,

        endTime,

        duration: contest.durationSeconds,

        url: `https://codeforces.com/contest/${contest.id}`,

        phase: contest.phase,

        type: contest.type,

        lastSyncedAt: new Date(),
      },

      {
        upsert: true,

        new: true,

        setDefaultsOnInsert: true,
      },
    );

    synced++;
  }

  return {
    platform: "Codeforces",

    total: contests.length,

    synced,
  };
};

export const syncLeetCodeContests = async () => {
  const contests = await fetchLeetCodeContests();

  let synced = 0;

  for (const contest of contests) {
    if (!contest.title || !contest.startTime || !contest.duration) {
      continue;
    }

    const externalId = `${contest.title}-${contest.startTime}`;

    const startTime = new Date(contest.startTime * 1000);

    const endTime = new Date((contest.startTime + contest.duration) * 1000);

    await Contest.findOneAndUpdate(
      {
        platform: "LeetCode",

        externalId,
      },

      {
        platform: "LeetCode",

        externalId,

        name: contest.title,

        startTime,

        endTime,

        duration: contest.duration,

        url: `https://leetcode.com/contest/${contest.title
          .toLowerCase()
          .replace(/\s+/g, "-")}/`,

        lastSyncedAt: new Date(),
      },

      {
        upsert: true,

        new: true,

        setDefaultsOnInsert: true,
      },
    );

    synced++;
  }

  return {
    platform: "LeetCode",

    total: contests.length,

    synced,
  };
};

export const syncCodeChefContests = async () => {
  const data = await fetchCodeChefContests();

  const allContests = [
    ...(data.future_contests || []),

    ...(data.present_contests || []),

    ...(data.past_contests || []),
  ];

  let synced = 0;

  for (const contest of allContests) {
    const externalId = String(
      contest.contest_code || contest.contestCode || contest.code,
    );

    const name = contest.contest_name || contest.contestName || contest.name;

    const start =
      contest.contest_start_date_iso || contest.conteststartdate_iso;

    const durationMinutes = Number(contest.contest_duration);

    if (!externalId || !name || !start || !durationMinutes) {
      continue;
    }

    const startTime = new Date(start);

    const duration = durationMinutes * 60;

    const endTime = new Date(startTime.getTime() + duration * 1000);

    await Contest.findOneAndUpdate(
      {
        platform: "CodeChef",

        externalId,
      },

      {
        platform: "CodeChef",

        externalId,

        name,

        startTime,

        endTime,

        duration,

        url: `https://www.codechef.com/${externalId}`,

        lastSyncedAt: new Date(),
      },

      {
        upsert: true,

        new: true,

        setDefaultsOnInsert: true,
      },
    );

    synced++;
  }

  return {
    platform: "CodeChef",

    total: allContests.length,

    synced,
  };
};

export const syncAllContests = async () => {
  const results = {};

  try {
    results.codeforces = await syncCodeforcesContests();
  } catch (error) {
    results.codeforces = {
      error: error.message,
    };
  }

  try {
    results.leetcode = await syncLeetCodeContests();
  } catch (error) {
    results.leetcode = {
      error: error.message,
    };
  }

  try {
    results.codechef = await syncCodeChefContests();
  } catch (error) {
    results.codechef = {
      error: error.message,
    };
  }

  return results;
};

const getAnalyticsStartDate = (period) => {
  const now = new Date();

  switch (period) {
    case "week": {
      const date = new Date(now);

      date.setDate(date.getDate() - 7);

      return date;
    }

    case "month": {
      const date = new Date(now);

      date.setMonth(date.getMonth() - 1);

      return date;
    }

    case "3months": {
      const date = new Date(now);

      date.setMonth(date.getMonth() - 3);

      return date;
    }

    case "6months": {
      const date = new Date(now);

      date.setMonth(date.getMonth() - 6);

      return date;
    }

    case "year": {
      const date = new Date(now);

      date.setFullYear(date.getFullYear() - 1);

      return date;
    }

    case "all":
    default:
      return null;
  }
};

export const syncAllUserContests = async (userId) => {
  const results = {};

  try {
    results.codeforces = await syncCodeforcesUserContests(userId);
  } catch (error) {
    results.codeforces = {
      error: error.message,
    };
  }

  try {
    results.leetcode = await syncLeetCodeUserContests(userId);
  } catch (error) {
    results.leetcode = {
      error: error.message,
    };
  }

  try {
    results.codechef = await syncCodeChefUserContests(userId);
  } catch (error) {
    results.codechef = {
      error: error.message,
    };
  }

  return results;
};
