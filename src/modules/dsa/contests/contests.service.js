import ContestList from "./contests.model.js";

export const getUpcommingContests = async ({ platform, limit }) => {
  const now = new Date();

  const filter = {
    startTime: {
      $gt: now,
    },
  };

  if (platform) {
    filter.platform = platform;
  }

  let query = ContestList.find(filter).sort({ startTime: 1 });

  if (limit) {
    query = query.limit(Number(limit));
  }

  const contests = await query;

  return contests;
};

export const getLiveContests = async ({ platform, limit }) => {
  const now = new Date();

  const filter = {
    startTime: {
      $lte: now,
    },
    endTime: {
      $gt: now,
    },
  };

  if (platform) {
    filter.platform = platform;
  }

  let query = ContestList.find(filter).sort({ startTime: 1 });

  if (limit) {
    query = query.limit(Number(limit));
  }

  const contests = await query;
  
  return contests;
};
