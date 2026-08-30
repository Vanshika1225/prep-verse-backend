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

  const pageNumber = Number(page);
  const limitNumber = Number(limit);

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

  const totalProblems = await AllProblems.countDocuments(problemFilter);

  const problems = await AllProblems.find(problemFilter)
    .skip((pageNumber - 1) * limitNumber)
    .limit(limitNumber);

  const progress = await UserProblem.find({
    userId: req.user.userId,
    problemId: {
      $in: problems.map((problem) => problem._id),
    },
  });

  const progressMap = {};

  progress.forEach((item) => {
    progressMap[item.problemId.toString()] = item;
  });

  let result = problems.map((problem) => ({
    ...problem.toObject(),
    status: progressMap[problem._id]?.status || "Not Started",
    bookmarked: progressMap[problem._id]?.bookmarked || false,
  }));

  if (status) {
    result = result.filter((item) => item.status === status);
  }

  if (bookmarked !== undefined) {
    result = result.filter(
      (item) => item.bookmarked === (bookmarked === "true"),
    );
  }

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

  const userId = req.user.userId;
  const problemId = req.params.problemId;

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
          solvedProblemIds: new mongoose.Types.ObjectId(problemId),
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

  return recentProblems.map((item) => ({
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

  return await UserProblem.aggregate([
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
      },
    },
  ]);
};
