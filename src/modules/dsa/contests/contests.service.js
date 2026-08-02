import ContestList from "./contests.model.js";

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
  let query = ContestList.find(filter).sort({ startTime: 1 });

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
  let query = ContestList.find(filter).sort({ startTime: 1 });

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

  const contests = await ContestList.find(filter)
    .sort({
      endTime: -1,
    })
    .skip(skip)
    .limit(limit)
    .lean();

  console.log("RESULT COUNT:", contests.length);

  const total = await ContestList.countDocuments(filter);

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
