import mongoose from "mongoose";

import {
  AllProblems,
  PROBLEM_STATUSES,
  UserProblem,
} from "./allProblems.model.js";

import { getDayKey } from "../../../utils/date.js";
import { UserActivity } from "../../users/users.model.js";

export const getAllProblems = async (req) => {
  const {
    search,
    difficulty,
    topic,
    status,
    bookmarked,
    page = 1,
    limit = 10,
  } = req.query;

  const pageNumber = Math.max(Number(page) || 1, 1);
  const limitNumber = Math.max(Number(limit) || 10, 1);

  const userId = new mongoose.Types.ObjectId(req.user.userId);

  const problemFilter = {};

  if (search) {
    problemFilter.title = {
      $regex: search,
      $options: "i",
    };
  }

  if (difficulty) {
    problemFilter.difficulty = difficulty;
  }

  if (topic) {
    problemFilter.topics = topic;
  }

  const [topics, difficulties] = await Promise.all([
    AllProblems.distinct("topics"),
    AllProblems.distinct("difficulty"),
  ]);

  const userProgressFilter = {
    userId,
  };

  if (status) {
    userProgressFilter.status = status;
  }

  if (bookmarked !== undefined) {
    userProgressFilter.bookmarked = bookmarked === "true";
  }

  let problemIds = null;

  if (status || bookmarked !== undefined) {
    const userProblems = await UserProblem.find(userProgressFilter)
      .select("problemId")
      .lean();

    problemIds = userProblems.map((item) => item.problemId);

    if (problemIds.length === 0) {
      return {
        problems: [],
        filters: {
          topics: topics.filter(Boolean).sort(),
          difficulties: difficulties.filter(Boolean).sort(),
          statuses: PROBLEM_STATUSES,
        },
        pagination: {
          totalProblems: 0,
          currentPage: pageNumber,
          totalPages: 0,
          limit: limitNumber,
        },
      };
    }

    problemFilter._id = {
      $in: problemIds,
    };
  }
  const totalProblems = await AllProblems.countDocuments(problemFilter);

  const problems = await AllProblems.find(problemFilter)
    .sort({ createdAt: -1 })
    .skip((pageNumber - 1) * limitNumber)
    .limit(limitNumber)
    .lean();

  const progress = await UserProblem.find({
    userId,
    problemId: {
      $in: problems.map((problem) => problem._id),
    },
  }).lean();

  const progressMap = {};

  for (const item of progress) {
    progressMap[item.problemId.toString()] = item;
  }

  const result = problems.map((problem) => {
    const userProgress = progressMap[problem._id.toString()];
    return {
      ...problem,
      status: userProgress?.status || "Not Started",
      bookmarked: userProgress?.bookmarked || false,
    };
  });

  return {
    problems: result,

    filters: {
      topics: topics.filter(Boolean).sort(),
      difficulties: difficulties.filter(Boolean).sort(),
      statuses: PROBLEM_STATUSES,
    },
    pagination: {
      totalProblems,
      currentPage: pageNumber,
      totalPages: Math.ceil(totalProblems / limitNumber),
      limit: limitNumber,
    },
  };
};

export const updateUserProblem = async (req) => {
  const { status, bookmarked } = req.body;

  const userId = new mongoose.Types.ObjectId(req.user.userId);
  const problemId = new mongoose.Types.ObjectId(req.params.problemId);

  const existing = await UserProblem.findOne({
    userId,
    problemId,
  });

  const wasAlreadySolved = existing?.firstSolvedAt != null;

  const updateData = {};

  if (status !== undefined) {
    updateData.status = status;
  }

  if (bookmarked !== undefined) {
    updateData.bookmarked = bookmarked;
  }

  if (status === "Solved" && !wasAlreadySolved) {
    updateData.firstSolvedAt = new Date();
  }

  const updated = await UserProblem.findOneAndUpdate(
    {
      userId,
      problemId,
    },
    {
      $set: updateData,
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );

  if (status === "Solved" && !wasAlreadySolved) {
    const now = new Date();

    const dayKey = getDayKey(now, "Asia/Kolkata");

    await UserActivity.findOneAndUpdate(
      {
        userId,
        dayKey,
      },
      {
        $setOnInsert: {
          activityAt: now,
        },

        $addToSet: {
          solvedProblemIds: problemId,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );
  }

  return updated;
};

export const getOverviewCounts = async (userId) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const [solved, attempted, bookmarked, review] = await Promise.all([
    UserProblem.countDocuments({
      userId: userObjectId,
      status: "Solved",
    }),

    UserProblem.countDocuments({
      userId: userObjectId,
      status: "Attempted",
    }),

    UserProblem.countDocuments({
      userId: userObjectId,
      bookmarked: true,
    }),

    UserProblem.countDocuments({
      userId: userObjectId,
      status: "Review",
    }),
  ]);

  return {
    solved,
    attempted,
    bookmarked,
    review,
  };
};

export const getRecentProblems = async (userId) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const recentProblems = await UserProblem.find({
    userId: userObjectId,
  })
    .sort({ updatedAt: -1 })
    .limit(5)
    .populate("problemId", "title difficulty slug");

  return recentProblems
    .filter((item) => item.problemId)
    .map((item) => ({
      id: item.problemId._id,
      title: item.problemId.title,
      slug: item.problemId.slug,
      difficulty: item.problemId.difficulty,
      status: item.status,
      bookmarked: item.bookmarked,
      updatedAt: item.updatedAt,
    }));
};

export const getTopicBreakdown = async (userId) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const result = await UserProblem.aggregate([
    {
      $match: {
        userId: userObjectId,
        status: "Solved",
      },
    },
    {
      $lookup: {
        from: "problems",
        localField: "problemId",
        foreignField: "_id",
        as: "problem",
      },
    },
    {
      $unwind: "$problem",
    },
    {
      $unwind: "$problem.topics",
    },
    {
      $group: {
        _id: "$problem.topics",
        solved: {
          $sum: 1,
        },
      },
    },
    {
      $project: {
        _id: 0,
        topic: "$_id",
        solved: 1,
      },
    },
    {
      $sort: {
        solved: -1,
        topic: 1,
      },
    },
  ]);

  return result;
};
