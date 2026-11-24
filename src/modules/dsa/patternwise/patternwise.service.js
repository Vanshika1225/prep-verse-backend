import mongoose from "mongoose";
import { AllProblems, UserProblem } from "../allProblems/allProblems.model.js";
import { LearningPoints } from "./patternwise.model.js";
import problemsJson from "../allProblems/problems.json" with { type: "json" };
import patternDataJson from "./patternJson.json" with { type: "json" };
import logger from "../../../utils/logger.js";

const getUserObjectId = (userId) => {
  return mongoose.isValidObjectId(userId) ? new mongoose.Types.ObjectId(userId) : null;
};

const getUserFilter = (userId) => {
  if (!userId) return {};
  const isObjectId = mongoose.isValidObjectId(userId);
  const userObjectId = isObjectId ? new mongoose.Types.ObjectId(userId) : null;
  return userObjectId
    ? { $or: [{ userId: String(userId) }, { userId: userObjectId }] }
    : { userId: String(userId) };
};

const escapeRegex = (text = "") => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Auto-seeds AllProblems from problems.json if collection is empty.
 */
let isSeeding = false;
const ensureProblemsSeeded = async () => {
  if (isSeeding) return;
  try {
    const count = await AllProblems.countDocuments();
    if (count === 0 && Array.isArray(problemsJson) && problemsJson.length > 0) {
      isSeeding = true;
      logger.info(`Auto-seeding ${problemsJson.length} problems into AllProblems...`);
      await AllProblems.insertMany(problemsJson, { ordered: false });
      logger.info("Auto-seeding AllProblems completed successfully.");
    }
  } catch (err) {
    logger.error("Error auto-seeding AllProblems:", err.message);
  } finally {
    isSeeding = false;
  }
};

/**
 * Compute fallback patterns directly from problems.json if DB has not populated yet.
 */
const getFallbackPatterns = (solvedProblemIds = new Set()) => {
  const topicMap = {};

  // Initialize with predefined pattern categories from patternJson.json
  Object.keys(patternDataJson).forEach((name) => {
    topicMap[name] = {
      name,
      totalProblems: 0,
      solvedProblems: 0,
    };
  });

  problemsJson.forEach((p) => {
    (p.topics || []).forEach((t) => {
      // Normalize common synonyms (e.g., Arrays -> Array)
      let matchedName = t;
      if (t === "Arrays") matchedName = "Array";
      else if (t === "Trees") matchedName = "Tree";
      else if (t === "Graphs") matchedName = "Graph";

      if (!topicMap[matchedName]) {
        topicMap[matchedName] = {
          name: matchedName,
          totalProblems: 0,
          solvedProblems: 0,
        };
      }

      topicMap[matchedName].totalProblems++;
    });
  });

  const patterns = Object.values(topicMap)
    .filter((p) => p.totalProblems > 0)
    .sort((a, b) => b.totalProblems - a.totalProblems)
    .map((p) => ({
      name: p.name,
      totalProblems: p.totalProblems,
      solvedProblems: p.solvedProblems,
      progress:
        p.totalProblems === 0
          ? 0
          : Number(((p.solvedProblems / p.totalProblems) * 100).toFixed(2)),
    }));

  return {
    overall: {
      totalProblems: problemsJson.length,
      solvedProblems: solvedProblemIds.size,
      progress:
        problemsJson.length === 0
          ? 0
          : Number(((solvedProblemIds.size / problemsJson.length) * 100).toFixed(2)),
    },
    patterns,
  };
};

export const getAllPatternsService = async (userId) => {
  // Trigger background seed if DB is currently empty
  ensureProblemsSeeded().catch(() => {});

  const userFilter = getUserFilter(userId);

  const solvedProblems = await UserProblem.find({
    ...userFilter,
    status: "Solved",
  }).select("problemId");

  const solvedProblemIds = new Set(
    solvedProblems.map((item) => item.problemId?.toString()).filter(Boolean),
  );

  const totalProblems = await AllProblems.countDocuments();

  if (totalProblems === 0) {
    return getFallbackPatterns(solvedProblemIds);
  }

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
        totalProblems: -1,
      },
    },
  ]);

  if (patternAggregation.length === 0) {
    return getFallbackPatterns(solvedProblemIds);
  }

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
          : Number(((solvedCount / pattern.totalProblems) * 100).toFixed(2)),
    };
  });

  return {
    overall: {
      totalProblems,
      solvedProblems: solvedProblemIds.size,
      progress:
        totalProblems === 0
          ? 0
          : Number(((solvedProblemIds.size / totalProblems) * 100).toFixed(2)),
    },
    patterns,
  };
};

export const getPatternDifficultyService = async (userId, pattern) => {
  const userFilter = getUserFilter(userId);
  const regex = new RegExp(`^${escapeRegex(pattern.trim())}$`, "i");

  let problems = await AllProblems.find({
    topics: regex,
  }).select("_id difficulty");

  if (!problems.length && Array.isArray(problemsJson)) {
    problems = problemsJson.filter((p) =>
      (p.topics || []).some((t) => regex.test(t)),
    );
  }

  const solvedProblems = await UserProblem.find({
    ...userFilter,
    status: "Solved",
  }).select("problemId");

  const solvedSet = new Set(
    solvedProblems.map((problem) => problem.problemId?.toString()).filter(Boolean),
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
    const difficulty = (problem.difficulty || "").toLowerCase();

    if (result[difficulty]) {
      result[difficulty].total++;

      if (problem._id && solvedSet.has(problem._id.toString())) {
        result[difficulty].solved++;
      }
    }
  }

  ["easy", "medium", "hard"].forEach((level) => {
    const item = result[level];
    item.progress =
      item.total === 0
        ? 0
        : Number(((item.solved / item.total) * 100).toFixed(2));
  });

  return result;
};

export const getLearningPointsService = async (pattern) => {
  const slug = pattern.toLowerCase().replace(/\s+/g, "-").replace(/[()]/g, "");
  const patternData = await LearningPoints.findOne({
    slug,
  }).select("name learningPoints");

  if (!patternData) {
    const directPoints = patternDataJson[pattern] || patternDataJson[pattern.replace(/s$/, "")];
    return {
      pattern,
      learningPoints: directPoints || [
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
  const userFilter = getUserFilter(userId);
  const regex = new RegExp(`^${escapeRegex(pattern.trim())}$`, "i");

  const solvedProblems = await UserProblem.find({
    ...userFilter,
    status: "Solved",
  }).select("problemId");

  const solvedIds = solvedProblems.map((item) => item.problemId);

  let recommended = await AllProblems.aggregate([
    {
      $match: {
        topics: regex,
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
          topics: regex,
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

  // Fallback from problems.json if DB has not populated
  if (recommended.length === 0 && Array.isArray(problemsJson)) {
    const matched = problemsJson.filter((p) =>
      (p.topics || []).some((t) => regex.test(t)),
    );
    recommended = matched.slice(0, 5).map((p, idx) => ({
      _id: `fallback-${idx}`,
      title: p.title,
      difficulty: p.difficulty,
      slug: p.slug,
      problemLink: p.problemLink,
    }));
  }

  return recommended;
};
