import { AllProblems, UserProblem } from "../allProblems/allProblems.model.js";

export const allRandomProblemService = async ({
  userId,
  topics = [],
  difficulty = [],
  count = 10,
  excludeSolved = false,
  bookmarkedOnly = false,
}) => {
  const filter = {};

  if (topics.length) {
    filter.topics = {
      $in: topics,
    };
  }

  if (difficulty.length) {
    filter.difficulty = {
      $in: difficulty,
    };
  }

  if (excludeSolved) {
    const solvedProblems = await UserProblem.find({
      userId,
      status: "Solved",
    }).select("problemId");

    const solvedId = solvedProblems.map((item) => item.problemId);

    filter._id = {
      ...(filter._id || {}),
      $nin: solvedId,
    };
  }

  if (bookmarkedOnly) {
    const bookmarkedProblems = UserProblem.find({
      userId,
      bookmarked: true,
    }).select("problemId");

    const bookmarkeddId = (await bookmarkedProblems).map(
      (item) => item.problemId,
    );
    filter._id = {
      ...(filter._id || {}),
      $in: bookmarkeddId,
    };
  }

  const problems = await AllProblems.aggregate([
    {
      $match: filter,
    },
    {
      $sample: {
        size: Number(count),
      },
    },
  ]);

  return {
    total: problems.length,
    problems,
  };
};

export const getRecentActivityService = async ({ userId }) => {
  const recentActivity = await UserProblem.find({ userId })
    .populate("problemId", "title difficulty topics slug")
    .sort({ updatedAt: -1 })
    .limit(5);

  return recentActivity.map((item) => ({
    problemId: item.problemId._id,
    title: item.problemId.title,
    slug: item.problemId.slug,
    difficulty: item.problemId.difficulty,
    topics: item.problemId.topics,
    status: item.status,
    bookmarked: item.bookmarked,
    updatedAt: item.updatedAt,
  }));
};
