import { Contest, UserContest } from "./contests.model.js";
import { UserProfile } from "../../users/users.model.js";
import logger from "../../../utils/logger.js";

export const getUpcommingContests = async ({ platform, limit, search }) => {
  const now = new Date();

  const filter = {
    startTime: {
      $gt: now,
    },
  };

  if (platform) {
    filter.platform = platform;
  }
  if (search?.trim()) {
    const searchValue = search.trim();

    filter.$or = [
      {
        name: {
          $regex: searchValue,
          $options: "i",
        },
      },
      {
        platform: {
          $regex: searchValue,
          $options: "i",
        },
      },
      {
        type: {
          $regex: searchValue,
          $options: "i",
        },
      },
      {
        externalId: {
          $regex: searchValue,
          $options: "i",
        },
      },
    ];
  }
  let query = Contest.find(filter).sort({ startTime: 1 });

  if (limit) {
    query = query.limit(Number(limit));
  }

  const contests = await query;

  return contests;
};

export const getLiveContests = async ({ platform, limit, search }) => {
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

  if (search?.trim()) {
    const searchValue = search.trim();

    filter.$or = [
      {
        name: {
          $regex: searchValue,
          $options: "i",
        },
      },
      {
        platform: {
          $regex: searchValue,
          $options: "i",
        },
      },
      {
        type: {
          $regex: searchValue,
          $options: "i",
        },
      },
      {
        externalId: {
          $regex: searchValue,
          $options: "i",
        },
      },
    ];
  }
  let query = Contest.find(filter).sort({ startTime: 1 });

  if (limit) {
    query = query.limit(Number(limit));
  }

  const contests = await query;

  return contests;
};

export const getCompletedContestsService = async ({
  page = 1,
  limit = 10,
  platform,
  search,
}) => {
  const now = new Date();

  page = Number(page);
  limit = Number(limit);

  const skip = (page - 1) * limit;

  const filter = {
    endTime: {
      $lt: now,
    },
  };

  if (platform) {
    filter.platform = platform;
  }

  if (search?.trim()) {
    const searchValue = search.trim();

    filter.$or = [
      {
        name: {
          $regex: searchValue,
          $options: "i",
        },
      },
      {
        platform: {
          $regex: searchValue,
          $options: "i",
        },
      },
      {
        type: {
          $regex: searchValue,
          $options: "i",
        },
      },
      {
        externalId: {
          $regex: searchValue,
          $options: "i",
        },
      },
    ];
  }

  const contests = await Contest.find(filter)
    .sort({
      endTime: -1,
    })
    .skip(skip)
    .limit(limit)
    .lean();

  logger.info("RESULT COUNT:", contests.length);

  const total = await Contest.countDocuments(filter);

  return {
    contests,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getContestAnalytics = async ({ userId, period = "thisMonth" }) => {
  const now = new Date();

  let startDate = null;

  if (period === "thisMonth") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  if (period === "lastMonth") {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  }

  if (period === "thisYear") {
    startDate = new Date(now.getFullYear(), 0, 1);
  }

  const filter = {
    userId,
    participated: true,
  };

  if (startDate) {
    filter.attendedAt = {
      $gte: startDate,
      $lte: now,
    };
  }

  const userContests = await UserContest.find(filter)
    .populate("contestId")
    .sort({
      attendedAt: 1,
    })
    .lean();

  const participated = userContests.length;

  const won = userContests.filter(
    (contest) => contest.rank != null && contest.rank === 1,
  ).length;

  const top10Finishes = userContests.filter(
    (contest) => contest.rank != null && contest.rank <= 10,
  ).length;

  const winRate =
    participated > 0 ? Number(((won / participated) * 100).toFixed(1)) : 0;

  const contestsWithRating = userContests.filter(
    (contest) => contest.ratingAfter != null,
  );

  const latestRatingContest =
    contestsWithRating.length > 0
      ? contestsWithRating[contestsWithRating.length - 1]
      : null;

  const contestRating = latestRatingContest?.ratingAfter ?? null;

  const highestRating =
    contestsWithRating.length > 0
      ? Math.max(...contestsWithRating.map((contest) => contest.ratingAfter))
      : null;

  const latestRatingChange = latestRatingContest?.ratingChange ?? null;

  const activityMap = {};

  userContests.forEach((contest) => {
    if (!contest.attendedAt) {
      return;
    }

    const date = new Date(contest.attendedAt);

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(date.getDate()).padStart(2, "0")}`;

    if (!activityMap[key]) {
      activityMap[key] = 0;
    }

    activityMap[key]++;
  });

  const activity = Object.entries(activityMap)
    .map(([date, count]) => ({
      date,
      count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const platformBreakdown = {
    LeetCode: 0,
    Codeforces: 0,
    CodeChef: 0,
  };

  userContests.forEach((contest) => {
    if (platformBreakdown[contest.platform] !== undefined) {
      platformBreakdown[contest.platform]++;
    }
  });

  const recentContests = [...userContests]
    .sort((a, b) => new Date(b.attendedAt) - new Date(a.attendedAt))
    .slice(0, 5)
    .map((contest) => ({
      contestId: contest.contestId?._id,

      name: contest.contestId?.name ?? "Unknown Contest",

      platform: contest.platform,

      rank: contest.rank,

      ratingBefore: contest.ratingBefore,

      ratingAfter: contest.ratingAfter,

      ratingChange: contest.ratingChange,

      attendedAt: contest.attendedAt,
    }));

  return {
    performance: {
      participated,
      won,
      top10Finishes,
      winRate,
    },

    ratings: {
      contestRating,
      highestRating,
      latestRatingChange,
    },

    activity,

    platformBreakdown,

    recentContests,
  };
};
