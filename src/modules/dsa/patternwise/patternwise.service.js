import mongoose from "mongoose";
import { AllProblems, UserProblem } from "../allProblems/allProblems.model.js";
import { LearningPoints } from "./patternwise.model.js";

export const getAllPatternsService = async (userId) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const totalProblems = await AllProblems.countDocuments();

  const solvedProblems = await UserProblem.find({
    userId: userObjectId,
    status: "Solved",
  }).select("problemId");

  const solvedProblemIds = new Set(
    solvedProblems.map((item) => item.problemId.toString()),
  );

  const patternAggregation = await AllProblems.aggregate([
    {
      $unwind: "$topics",
    },
    {
      $group: {
        _id: "$topics",
        totalProblems: {
          $sum: 1,
        },
        problemIds: {
          $push: "$_id",
        },
      },
    },
    {
      $sort: {
        _id: 1,
      },
    },
  ]);

  const patterns = patternAggregation.map((pattern) => {
    let solvedCount = 0;

    pattern.problemIds.forEach((id) => {
      if (solvedProblemIds.has(id.toString())) {
        solvedCount++;
      }
    });

    return {
      name: pattern._id,
      totalProblems: pattern.totalProblems,
      solvedProblems: solvedCount,
      progress:
        pattern.totalProblems === 0
          ? 0
          : Math.round((solvedCount / pattern.totalProblems) * 100),
    };
  });

  return {
    overall: {
      totalProblems,
      solvedProblems: solvedProblemIds.size,
      progress:
        totalProblems === 0
          ? 0
          : Math.round((solvedProblemIds.size / totalProblems) * 100),
    },
    patterns,
  };
};

export const getPatternDifficultyService = async (userId, pattern) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const problems = await AllProblems.find({
    topics: pattern,
  }).select("_id difficulty");

  const solvedProblems = await UserProblem.find({
    userId: userObjectId,
    status: "Solved",
  }).select("problemId");

  const solvedSet = new Set(
    solvedProblems.map((problem) => problem.problemId.toString()),
  );

  const result = {
    pattern,

    easy: {
      total: 0,
      solved: 0,
      progress: 0,
    },

    medium: {
      total: 0,
      solved: 0,
      progress: 0,
    },

    hard: {
      total: 0,
      solved: 0,
      progress: 0,
    },
  };

  for (const problem of problems) {
    const difficulty = problem.difficulty.toLowerCase();

    result[difficulty].total++;

    if (solvedSet.has(problem._id.toString())) {
      result[difficulty].solved++;
    }
  }

  ["easy", "medium", "hard"].forEach((level) => {
    const item = result[level];

    item.progress =
      item.total === 0 ? 0 : Math.round((item.solved / item.total) * 100);
  });

  return result;
};
export const getLearningPointsService = async (pattern) => {
  const patternData = await LearningPoints.findOne({
    slug: pattern.toLowerCase(),
  }).select("name learningPoints");

  if (!patternData) {
    return {
      pattern,
      learningPoints: [
        "Strengthen problem-solving and algorithmic thinking.",
        "Improve time and space complexity analysis.",
        "Recognize common coding interview patterns.",
        "Practice writing clean and optimized solutions.",
        "Build confidence through progressively challenging problems.",
      ],
    };
  }

  return {
    pattern: patternData.name,
    learningPoints: patternData.learningPoints,
  };
};

export const getRecommendedProblemsService = async (userId, pattern) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const solvedProblems = await UserProblem.find({
    userId: userObjectId,
    status: "Solved",
  }).select("problemId");

  const solvedIds = solvedProblems.map((item) => item.problemId);

  let recommended = await AllProblems.aggregate([
    {
      $match: {
        topics: pattern,
        _id: { $nin: solvedIds },
      },
    },
    {
      $sample: {
        size: 5,
      },
    },
    {
      $project: {
        title: 1,
        difficulty: 1,
        slug: 1,
        problemLink: 1,
      },
    },
  ]);

  if (recommended.length === 0) {
    recommended = await AllProblems.aggregate([
      {
        $match: {
          topics: pattern,
        },
      },
      {
        $sample: {
          size: 5,
        },
      },
      {
        $project: {
          title: 1,
          difficulty: 1,
          slug: 1,
          problemLink: 1,
        },
      },
    ]);
  }

  return recommended;
};