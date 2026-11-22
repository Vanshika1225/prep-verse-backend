import mongoose from "mongoose";
import User from "../auth/auth.model.js";
import { UserProfile, UserActivity } from "../users/users.model.js";
import { UserProblem } from "../dsa/allProblems/allProblems.model.js";
import { StudyTask } from "../studyPlanner/studyPlanner.model.js";
import { Roadmap } from "../roadmap/roadmap.model.js";
import { JobTracker, JobActivity } from "../jobTracker/jobTracker.model.js";
import { getDayKey } from "../../utils/date.js";
import { calculateConsecutiveDays, TIME_ZONE } from "../users/users.utils.js";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SLOTS = ["Morning", "Afternoon", "Evening", "Night"];

const toUserObjectId = (userId) => {
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

const getTaskDurationMinutes = (task) => {
  if (!task?.startTime || !task?.endTime) return 0;
  try {
    const [sh, sm] = task.startTime.split(":").map(Number);
    const [eh, em] = task.endTime.split(":").map(Number);
    return Math.max(0, eh * 60 + em - (sh * 60 + sm));
  } catch {
    return 0;
  }
};

const getLastNDayKeys = (n = 7, offsetDays = 0) => {
  const result = [];
  const now = new Date();
  for (let i = n - 1 + offsetDays; i >= offsetDays; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    result.push(getDayKey(d, TIME_ZONE));
  }
  return result;
};

const getDayAndSlot = (date) => {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;

  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short",
  }).format(d);
  const dayIndex = DAYS.indexOf(weekday);
  if (dayIndex === -1) return null;

  const hourStr = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour: "numeric",
    hour12: false,
  }).format(d);
  const hour = parseInt(hourStr, 10) % 24;

  let slotIndex = 3; // Night (00:00 - 05:59)
  if (hour >= 6 && hour < 12) slotIndex = 0; // Morning (06:00 - 11:59)
  else if (hour >= 12 && hour < 18) slotIndex = 1; // Afternoon (12:00 - 17:59)
  else if (hour >= 18 && hour < 24) slotIndex = 2; // Evening (18:00 - 23:59)

  return { dayIndex, slotIndex, dayKey: getDayKey(d, TIME_ZONE) };
};

const getMondayOfCurrentWeek = () => {
  const now = new Date();
  const todayKey = getDayKey(now, TIME_ZONE);
  const [y, m, d] = todayKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date;
};

const collectAllActivityDays = async (userId) => {
  const userObjectId = toUserObjectId(userId);
  const userFilter = getUserFilter(userId);

  const [
    userActivities,
    userProblems,
    completedTasks,
    roadmaps,
    jobActivities,
  ] = await Promise.all([
    UserActivity.find(userFilter).lean(),
    UserProblem.find(userFilter).lean(),
    StudyTask.find({ ...userFilter, status: "Completed" }).lean(),
    Roadmap.find(userFilter).lean(),
    JobActivity.find(userFilter).lean(),
  ]);

  const activityDays = new Set();

  userActivities.forEach((a) => {
    if (a.dayKey) activityDays.add(a.dayKey);
  });

  userProblems.forEach((p) => {
    if (p.status === "Solved" || p.status === "Attempted") {
      const k = getDayKey(p.updatedAt || p.createdAt, TIME_ZONE);
      activityDays.add(k);
    }
  });

  completedTasks.forEach((t) => {
    const k = getDayKey(t.completedAt || t.updatedAt || t.scheduledDate, TIME_ZONE);
    activityDays.add(k);
  });

  roadmaps.forEach((r) => {
    r.milestones?.forEach((m) => {
      if (m.status === "Completed" && m.completedAt) {
        activityDays.add(getDayKey(m.completedAt, TIME_ZONE));
      }
    });
  });

  jobActivities.forEach((j) => {
    if (j.createdAt) {
      activityDays.add(getDayKey(j.createdAt, TIME_ZONE));
    }
  });

  return {
    activityDays,
    userActivities,
    userProblems,
    completedTasks,
    roadmaps,
    jobActivities,
  };
};

export const getDashboardSummary = async (userId) => {
  const userObjectId = toUserObjectId(userId);
  const userFilter = getUserFilter(userId);

  const [
    profile,
    user,
    activityData,
    applications,
  ] = await Promise.all([
    UserProfile.findOne(userFilter).lean(),
    User.findById(userId).select("name email").lean(),
    collectAllActivityDays(userId),
    JobTracker.find(userFilter).lean(),
  ]);

  const {
    activityDays,
    userActivities,
    userProblems,
    completedTasks,
    roadmaps,
  } = activityData;

  // 1. User name & Streak calculation
  const name = profile?.name || user?.name || "Learner";

  const now = new Date();
  const todayKey = getDayKey(now, TIME_ZONE);
  const activeToday = activityDays.has(todayKey);
  const startDate = new Date(now);
  if (!activeToday) {
    startDate.setDate(startDate.getDate() - 1);
  }
  const streak = calculateConsecutiveDays(activityDays, startDate);

  // 2. 7-Day Trend Date Keys (Past 7 days up to today)
  const last7DayKeys = getLastNDayKeys(7);
  const mondayThisWeek = getDayKey(getMondayOfCurrentWeek(), TIME_ZONE);

  // --- STAT 1: Problems Solved ---
  const solvedProblems = userProblems.filter((p) => p.status === "Solved");
  const totalSolved = solvedProblems.length;

  const dailySolvedMap = {};
  userActivities.forEach((a) => {
    if (a.dayKey) {
      dailySolvedMap[a.dayKey] = (dailySolvedMap[a.dayKey] || 0) + (a.solvedProblemIds?.length || 0);
    }
  });
  // Fallback for problems solved if userActivity was not populated
  solvedProblems.forEach((p) => {
    const k = getDayKey(p.updatedAt || p.createdAt, TIME_ZONE);
    if (!dailySolvedMap[k]) {
      dailySolvedMap[k] = (dailySolvedMap[k] || 0) + 1;
    }
  });

  let solvedThisWeek = 0;
  last7DayKeys.forEach((key) => {
    if (key >= mondayThisWeek) {
      solvedThisWeek += dailySolvedMap[key] || 0;
    }
  });

  const problemsSolvedTrend = last7DayKeys.map((k) => dailySolvedMap[k] || 0);

  // --- STAT 2: Study Hours ---
  let totalStudyMinutes = 0;
  const dailyStudyMinutesMap = {};

  completedTasks.forEach((t) => {
    const mins = getTaskDurationMinutes(t);
    totalStudyMinutes += mins;
    const k = getDayKey(t.completedAt || t.updatedAt || t.scheduledDate, TIME_ZONE);
    dailyStudyMinutesMap[k] = (dailyStudyMinutesMap[k] || 0) + mins;
  });

  roadmaps.forEach((r) => {
    r.milestones?.forEach((m) => {
      if (m.status === "Completed") {
        const mins = Math.round((m.estimatedHours || 0) * 60);
        totalStudyMinutes += mins;
        if (m.completedAt) {
          const k = getDayKey(m.completedAt, TIME_ZONE);
          dailyStudyMinutesMap[k] = (dailyStudyMinutesMap[k] || 0) + mins;
        }
      }
    });
  });

  const totalStudyHours = Math.floor(totalStudyMinutes / 60);
  const totalStudyRemainingMins = totalStudyMinutes % 60;
  const studyHoursValue =
    totalStudyHours > 0
      ? `${totalStudyHours}h${totalStudyRemainingMins > 0 ? ` ${totalStudyRemainingMins}m` : ""}`
      : totalStudyRemainingMins > 0
        ? `${totalStudyRemainingMins}m`
        : "0h";

  let thisWeekStudyMinutes = 0;
  last7DayKeys.forEach((key) => {
    if (key >= mondayThisWeek) {
      thisWeekStudyMinutes += dailyStudyMinutesMap[key] || 0;
    }
  });
  const thisWeekHoursFormatted = Math.round((thisWeekStudyMinutes / 60) * 10) / 10;
  const studyHoursDelta = `+${thisWeekHoursFormatted}h this week`;
  const studyHoursTrend = last7DayKeys.map((k) =>
    Math.round(((dailyStudyMinutesMap[k] || 0) / 60) * 10) / 10
  );

  // --- STAT 3: Tasks Completed ---
  const totalTasksCompleted = completedTasks.length;
  const dailyTasksMap = {};
  completedTasks.forEach((t) => {
    const k = getDayKey(t.completedAt || t.updatedAt || t.scheduledDate, TIME_ZONE);
    dailyTasksMap[k] = (dailyTasksMap[k] || 0) + 1;
  });

  let tasksThisWeek = 0;
  last7DayKeys.forEach((key) => {
    if (key >= mondayThisWeek) {
      tasksThisWeek += dailyTasksMap[key] || 0;
    }
  });
  const tasksCompletedDelta = `+${tasksThisWeek} this week`;
  const tasksCompletedTrend = last7DayKeys.map((k) => dailyTasksMap[k] || 0);

  // --- STAT 4: Roadmap Progress ---
  let totalMilestones = 0;
  let completedMilestones = 0;
  const dailyMilestonesMap = {};

  roadmaps.forEach((r) => {
    r.milestones?.forEach((m) => {
      totalMilestones++;
      if (m.status === "Completed") {
        completedMilestones++;
        if (m.completedAt) {
          const k = getDayKey(m.completedAt, TIME_ZONE);
          dailyMilestonesMap[k] = (dailyMilestonesMap[k] || 0) + 1;
        }
      }
    });
  });

  const overallProgressPct =
    totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;
  const roadmapProgressValue = `${overallProgressPct}%`;
  const roadmapProgressDelta = `${completedMilestones}/${totalMilestones} done`;
  const roadmapProgressTrend = last7DayKeys.map((k) => dailyMilestonesMap[k] || 0);

  // --- STAT 5: Applications Sent ---
  const totalApplications = applications.length;
  const dailyAppsMap = {};
  applications.forEach((app) => {
    const k = getDayKey(app.appliedDate || app.createdAt, TIME_ZONE);
    dailyAppsMap[k] = (dailyAppsMap[k] || 0) + 1;
  });

  let appsThisWeek = 0;
  last7DayKeys.forEach((key) => {
    if (key >= mondayThisWeek) {
      appsThisWeek += dailyAppsMap[key] || 0;
    }
  });
  const appsDelta = `+${appsThisWeek} this week`;
  const appsTrend = last7DayKeys.map((k) => dailyAppsMap[k] || 0);

  const stats = [
    {
      key: "problemsSolved",
      label: "Problems Solved",
      value: String(totalSolved),
      delta: `+${solvedThisWeek} this week`,
      trend: problemsSolvedTrend,
    },
    {
      key: "studyHours",
      label: "Study Hours",
      value: studyHoursValue,
      delta: studyHoursDelta,
      trend: studyHoursTrend,
    },
    {
      key: "tasksCompleted",
      label: "Tasks Completed",
      value: String(totalTasksCompleted),
      delta: tasksCompletedDelta,
      trend: tasksCompletedTrend,
    },
    {
      key: "roadmapProgress",
      label: "Roadmap Progress",
      value: roadmapProgressValue,
      delta: roadmapProgressDelta,
      trend: roadmapProgressTrend,
    },
    {
      key: "applicationsSent",
      label: "Applications Sent",
      value: String(totalApplications),
      delta: appsDelta,
      trend: appsTrend,
    },
  ];

  return {
    user: {
      name,
      streak,
    },
    stats,
  };
};

export const getDisciplineScore = async (userId) => {
  const {
    activityDays,
    userActivities,
    userProblems,
    completedTasks,
    roadmaps,
  } = await collectAllActivityDays(userId);

  const calculateScoreForKeys = (dayKeys) => {
    const keySet = new Set(dayKeys);

    // 1. Consistency: Active days out of 7 (40 points max)
    let activeDaysCount = 0;
    dayKeys.forEach((k) => {
      if (activityDays.has(k)) activeDaysCount++;
    });
    const consistencyScore = Math.round((activeDaysCount / 7) * 40);

    // 2. Study Tasks Completion (35 points max)
    let tasksCompletedInWindow = 0;
    completedTasks.forEach((t) => {
      const k = getDayKey(t.completedAt || t.updatedAt || t.scheduledDate, TIME_ZONE);
      if (keySet.has(k)) tasksCompletedInWindow++;
    });
    // Target: 1-2 tasks per active day, scale up to 35
    const taskScore = Math.min(35, tasksCompletedInWindow * 7);

    // 3. Problem solving & Roadmap milestones (25 points max)
    let problemsSolvedInWindow = 0;
    userActivities.forEach((a) => {
      if (keySet.has(a.dayKey)) {
        problemsSolvedInWindow += a.solvedProblemIds?.length || 0;
      }
    });
    userProblems.forEach((p) => {
      if (p.status === "Solved") {
        const k = getDayKey(p.updatedAt || p.createdAt, TIME_ZONE);
        if (keySet.has(k)) problemsSolvedInWindow++;
      }
    });

    let milestonesDoneInWindow = 0;
    roadmaps.forEach((r) => {
      r.milestones?.forEach((m) => {
        if (m.status === "Completed" && m.completedAt) {
          const k = getDayKey(m.completedAt, TIME_ZONE);
          if (keySet.has(k)) milestonesDoneInWindow++;
        }
      });
    });

    const practiceScore = Math.min(25, problemsSolvedInWindow * 5 + milestonesDoneInWindow * 10);

    return Math.min(100, consistencyScore + taskScore + practiceScore);
  };

  const currentWeekKeys = getLastNDayKeys(7, 0);
  const lastWeekKeys = getLastNDayKeys(7, 7);

  const currentScore = calculateScoreForKeys(currentWeekKeys);
  const lastWeekScore = calculateScoreForKeys(lastWeekKeys);

  const changeFromLastWeek = Math.max(0, currentScore - lastWeekScore);

  let message = "Start your daily study plan and solve problems to build your score.";
  if (currentScore >= 85) {
    message = "Exceptional consistency! You're in the top 5% of disciplined learners.";
  } else if (currentScore >= 70) {
    message = "Great consistency! You're consistently hitting your prep targets.";
  } else if (currentScore >= 50) {
    message = "Steady progress! Keep your daily streak going to boost your score.";
  } else if (currentScore > 0) {
    message = "Good start! Stick to your daily schedule to build discipline.";
  }

  return {
    score: currentScore,
    message,
    changeFromLastWeek,
  };
};

export const getWeeklyActivity = async (userId, range = "week") => {
  const userObjectId = toUserObjectId(userId);
  const userFilter = getUserFilter(userId);

  const now = new Date();
  let startDate;
  let endDate;

  if (range === "month") {
    // Start and end of current calendar month in Asia/Kolkata
    const todayKey = getDayKey(now, TIME_ZONE);
    const [y, m] = todayKey.split("-").map(Number);
    startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
    // Last day of month
    endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
  } else {
    // Monday 00:00:00 to Sunday 23:59:59 of current week
    startDate = getMondayOfCurrentWeek();
    endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + 6);
    endDate.setUTCHours(23, 59, 59, 999);
  }

  const [
    userActivities,
    userProblems,
    studyTasks,
    roadmaps,
    jobActivities,
  ] = await Promise.all([
    UserActivity.find({
      ...userFilter,
      $or: [
        { activityAt: { $gte: startDate, $lte: endDate } },
        { createdAt: { $gte: startDate, $lte: endDate } },
      ],
    }).lean(),
    UserProblem.find({
      ...userFilter,
      status: "Solved",
      $or: [
        { updatedAt: { $gte: startDate, $lte: endDate } },
        { createdAt: { $gte: startDate, $lte: endDate } },
      ],
    }).lean(),
    StudyTask.find({
      ...userFilter,
      status: "Completed",
      $or: [
        { completedAt: { $gte: startDate, $lte: endDate } },
        { updatedAt: { $gte: startDate, $lte: endDate } },
      ],
    }).lean(),
    Roadmap.find(userFilter).lean(),
    JobActivity.find({
      ...userFilter,
      createdAt: { $gte: startDate, $lte: endDate },
    }).lean(),
  ]);

  // counts[slotIndex][dayIndex] -> 4 rows (Morning, Afternoon, Evening, Night), 7 cols (Mon..Sun)
  const counts = Array.from({ length: 4 }, () => Array(7).fill(0));

  const recordEvent = (date, weight = 1) => {
    if (!date) return;
    const d = new Date(date);
    if (isNaN(d.getTime())) return;
    // Strictly only record events that occurred within the target window
    if (d < startDate || d > endDate) return;

    const info = getDayAndSlot(d);
    if (!info) return;
    const { dayIndex, slotIndex } = info;
    counts[slotIndex][dayIndex] += weight;
  };

  userActivities.forEach((a) => {
    const count = a.solvedProblemIds?.length || 1;
    recordEvent(a.activityAt || a.createdAt, count);
  });

  userProblems.forEach((p) => {
    if (p.status === "Solved") {
      recordEvent(p.updatedAt || p.createdAt, 1);
    }
  });

  studyTasks.forEach((t) => {
    // Only completed tasks count towards user activity
    if (t.status === "Completed") {
      recordEvent(t.completedAt || t.updatedAt, 1);
    }
  });

  roadmaps.forEach((r) => {
    r.milestones?.forEach((m) => {
      if (m.status === "Completed" && m.completedAt) {
        recordEvent(m.completedAt, 1);
      }
    });
  });

  jobActivities.forEach((j) => {
    if (j.createdAt) {
      recordEvent(j.createdAt, 1);
    }
  });

  // Map counts to levels 0-4
  const levels = counts.map((row) =>
    row.map((c) => {
      if (c === 0) return 0;
      if (range === "month") {
        if (c <= 2) return 1;
        if (c <= 5) return 2;
        if (c <= 8) return 3;
        return 4;
      } else {
        if (c === 1) return 1;
        if (c === 2) return 2;
        if (c <= 4) return 3;
        return 4;
      }
    })
  );

  return {
    days: DAYS,
    slots: SLOTS,
    levels,
  };
};
