import mongoose from "mongoose";
import { Roadmap } from "./roadmap.model.js";

const TAB_STATUS = {
  all: null,
  "in-progress": "In Progress",
  completed: "Completed",
};

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function formatRoadmap(roadmap) {
  const totalMilestones = roadmap.milestones.length;

  const completedMilestones = roadmap.milestones.filter(
    (m) => m.status === "Completed",
  ).length;

  let currentAssigned = false;

  const milestones = roadmap.milestones.map((m) => {
    let state = "Locked";

    if (m.status === "Completed") {
      state = "Completed";
    } else if (roadmap.status === "In Progress" && !currentAssigned) {
      state = "Current";
      currentAssigned = true;
    }

    return {
      _id: m._id,
      title: m.title,
      description: m.description,
      estimatedHours: m.estimatedHours,
      state,
      dueDate: m.dueDate,
      completedAt: m.completedAt,
    };
  });

  return {
    _id: roadmap._id,
    title: roadmap.title,
    description: roadmap.description,
    category: roadmap.category,
    difficulty: roadmap.difficulty,
    topics: roadmap.topics,
    status: roadmap.status,
    totalMilestones,
    completedMilestones,
    progress:
      totalMilestones > 0
        ? Math.round((completedMilestones / totalMilestones) * 100)
        : 0,
    estimatedHours: roadmap.milestones.reduce(
      (sum, m) => sum + (m.estimatedHours || 0),
      0,
    ),
    startedAt: roadmap.startedAt,
    completedAt: roadmap.completedAt,
    milestones,
  };
}

function startRoadmapIfNeeded(roadmap) {
  if (roadmap.status !== "Not Started") return;

  const now = new Date();
  let cumulativeHours = 0;

  roadmap.status = "In Progress";
  roadmap.startedAt = now;

  roadmap.milestones.forEach((milestone) => {
    cumulativeHours += milestone.estimatedHours || 1;

    const dueDate = new Date(now);
    dueDate.setDate(
      dueDate.getDate() +
        Math.ceil((cumulativeHours / roadmap.hoursPerWeek) * 7),
    );

    milestone.dueDate = dueDate;
  });
}

export const createRoadmap = async (req) => {
  const userId = req.user.userId;

  const {
    title,
    description,
    category,
    difficulty,
    topics,
    hoursPerWeek,
    milestones,
  } = req.body;

  const roadmap = await Roadmap.create({
    userId,
    title,
    description,
    category,
    difficulty,
    topics,
    hoursPerWeek,
    milestones,
  });

  return formatRoadmap(roadmap.toObject());
};

export const getRoadmaps = async (userId, query) => {
  const { tab = "all", category, search } = query;

  const filter = { userId };

  if (TAB_STATUS[tab]) {
    filter.status = TAB_STATUS[tab];
  }

  if (category && category !== "All") {
    filter.category = category;
  }

  if (search?.trim()) {
    const regex = new RegExp(escapeRegex(search.trim()), "i");

    filter.$or = [
      { title: regex },
      { description: regex },
      { topics: regex },
      { "milestones.title": regex },
    ];
  }

  const roadmaps = await Roadmap.find(filter).sort({ updatedAt: -1 }).lean();

  return roadmaps.map(formatRoadmap);
};

export const getRoadmapById = async (id, userId) => {
  const roadmap = await Roadmap.findOne({ _id: id, userId }).lean();

  if (!roadmap) return null;

  return formatRoadmap(roadmap);
};

export const getOverallProgress = async (userId) => {
  const roadmaps = await Roadmap.find({ userId }).lean();

  let totalMilestones = 0;
  let completedMilestones = 0;
  let investedHours = 0;

  roadmaps.forEach((roadmap) => {
    roadmap.milestones.forEach((milestone) => {
      totalMilestones += 1;

      if (milestone.status === "Completed") {
        completedMilestones += 1;
        investedHours += milestone.estimatedHours || 0;
      }
    });
  });

  const investedMinutes = Math.round(investedHours * 60);

  return {
    overallPercentage:
      totalMilestones > 0
        ? Math.round((completedMilestones / totalMilestones) * 100)
        : 0,
    roadmapsInProgress: roadmaps.filter((r) => r.status === "In Progress")
      .length,
    completedMilestones,
    totalMilestones,
    totalRoadmaps: roadmaps.length,
    totalTimeInvested: {
      hours: Math.floor(investedMinutes / 60),
      minutes: investedMinutes % 60,
      display: `${Math.floor(investedMinutes / 60)} hrs`,
    },
  };
};

export const getRecommendedRoadmaps = async (userId) => {
  const myRoadmaps = await Roadmap.find({ userId }).select("title").lean();
  const myTitles = myRoadmaps.map((r) => r.title.toLowerCase());

  const recommended = await Roadmap.aggregate([
    { $match: { userId: { $ne: new mongoose.Types.ObjectId(userId) } } },
    { $addFields: { titleKey: { $toLower: "$title" } } },
    {
      $group: {
        _id: "$titleKey",
        count: { $sum: 1 },
        title: { $first: "$title" },
        description: { $first: "$description" },
        category: { $first: "$category" },
        difficulty: { $first: "$difficulty" },
        topics: { $first: "$topics" },
        hoursPerWeek: { $first: "$hoursPerWeek" },
        milestones: { $first: "$milestones" },
      },
    },
    { $match: { _id: { $nin: myTitles } } },
    { $sort: { count: -1 } },
    { $limit: 3 },
  ]);

  return recommended.map((item) => ({
    title: item.title,
    description: item.description,
    category: item.category,
    difficulty: item.difficulty,
    topics: item.topics,
    hoursPerWeek: item.hoursPerWeek,
    usersCount: item.count,
    milestones: item.milestones.map((m) => ({
      title: m.title,
      description: m.description,
      estimatedHours: m.estimatedHours,
    })),
  }));
};

export const getUpcomingMilestones = async (userId) => {
  const roadmaps = await Roadmap.find({
    userId,
    status: "In Progress",
  }).lean();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const milestones = [];

  roadmaps.forEach((roadmap) => {
    roadmap.milestones.forEach((milestone) => {
      if (milestone.status === "Completed" || !milestone.dueDate) {
        return;
      }

      const dueDate = new Date(milestone.dueDate);

      milestones.push({
        milestoneId: milestone._id,
        title: milestone.title,
        description: milestone.description,
        roadmapId: roadmap._id,
        roadmapTitle: roadmap.title,
        dueDate: milestone.dueDate,
        isOverdue: dueDate < todayStart,
        estimatedHours: milestone.estimatedHours,
      });
    });
  });

  return milestones
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 4);
};

export const startRoadmap = async (id, userId) => {
  const roadmap = await Roadmap.findOne({ _id: id, userId });

  if (!roadmap) return null;

  startRoadmapIfNeeded(roadmap);
  await roadmap.save();

  return formatRoadmap(roadmap.toObject());
};

export const updateMilestoneStatus = async (
  id,
  milestoneId,
  userId,
  status,
) => {
  const roadmap = await Roadmap.findOne({ _id: id, userId });

  if (!roadmap) return null;

  const index = roadmap.milestones.findIndex(
    (m) => String(m._id) === milestoneId,
  );

  if (index === -1) return null;

  if (status === "Completed") {
    const previousDone = roadmap.milestones
      .slice(0, index)
      .every((m) => m.status === "Completed");

    if (!previousDone) {
      const error = new Error("Complete the previous milestones first.");
      error.status = 400;
      throw error;
    }

    startRoadmapIfNeeded(roadmap);

    if (roadmap.milestones[index].status !== "Completed") {
      roadmap.milestones[index].status = "Completed";
      roadmap.milestones[index].completedAt = new Date();
    }
  } else {
    for (let i = index; i < roadmap.milestones.length; i++) {
      roadmap.milestones[i].status = "Pending";
      roadmap.milestones[i].completedAt = null;
    }
  }

  const completedCount = roadmap.milestones.filter(
    (m) => m.status === "Completed",
  ).length;

  if (completedCount === roadmap.milestones.length) {
    roadmap.status = "Completed";
    roadmap.completedAt = new Date();
  } else {
    if (roadmap.status === "Completed") roadmap.status = "In Progress";
    roadmap.completedAt = null;
  }

  await roadmap.save();

  return formatRoadmap(roadmap.toObject());
};

export const deleteRoadmap = async (id, userId) => {
  const roadmap = await Roadmap.findOneAndDelete({ _id: id, userId });

  return roadmap ? { _id: roadmap._id } : null;
};
