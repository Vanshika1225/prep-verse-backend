import { StudyPlan, StudyTask } from "./studyPlanner.model.js";

const DAY_MAP = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function generateTasksForPlan(plan) {
  const tasks = [];

  const {
    specializations,
    availableDays,
    availableFrom,
    availableUntil,
    startDate,
    endDate,
  } = plan;

  if (!specializations?.length || !availableDays?.length) {
    return tasks;
  }

  const DAY_MAP = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const allowedDays = availableDays.map((day) => DAY_MAP[day]);

  const [fromH, fromM] = availableFrom.split(":").map(Number);
  const [untilH, untilM] = availableUntil.split(":").map(Number);

  const startMinutes = fromH * 60 + fromM;
  const endMinutes = untilH * 60 + untilM;
  const totalMinutes = endMinutes - startMinutes;

  if (totalMinutes <= 0) return tasks;

  const BREAK_DURATION = 45;
  const BREAK_COUNT = 2;
  const MIN_SESSION_DURATION = 30;

  const formatTime = (minutes) =>
    `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
      minutes % 60,
    ).padStart(2, "0")}`;

  const minutesPerSubject = totalMinutes / specializations.length;

  const addBreaks = minutesPerSubject >= 120;

  const studyMinutes = addBreaks
    ? totalMinutes - BREAK_DURATION * BREAK_COUNT
    : totalMinutes;

  if (studyMinutes < MIN_SESSION_DURATION) return tasks;

  const subjectsToday = Math.min(
    specializations.length,
    Math.floor(studyMinutes / MIN_SESSION_DURATION),
  );

  if (subjectsToday === 0) return tasks;

  const baseSessionDuration = Math.floor(studyMinutes / subjectsToday);

  const extraMinutes = studyMinutes % subjectsToday;

  const breakAfter = new Set();

  if (addBreaks) {
    if (subjectsToday === 1) {
      breakAfter.add(1);
    } else if (subjectsToday === 2) {
      breakAfter.add(1);
      breakAfter.add(2);
    } else {
      const firstBreak = Math.max(1, Math.round(subjectsToday / 3));

      const secondBreak = Math.min(
        subjectsToday,
        Math.max(firstBreak + 1, Math.round((subjectsToday * 2) / 3)),
      );

      breakAfter.add(firstBreak);
      breakAfter.add(secondBreak);
    }
  }

  let topicIndex = 0;

  const start = new Date(startDate);
  const end = new Date(endDate);

  for (
    let date = new Date(start);
    date <= end;
    date.setDate(date.getDate() + 1)
  ) {
    if (!allowedDays.includes(date.getDay())) continue;

    let currentMinutes = startMinutes;

    for (let i = 0; i < subjectsToday; i++) {
      const topic = specializations[topicIndex];

      const sessionDuration = baseSessionDuration + (i < extraMinutes ? 1 : 0);

      const sessionEnd = currentMinutes + sessionDuration;

      if (sessionEnd > endMinutes) break;

      tasks.push({
        planId: plan._id,
        userId: plan.userId,
        title: topic,
        topic,
        scheduledDate: new Date(date),
        startTime: formatTime(currentMinutes),
        endTime: formatTime(sessionEnd),
        status: "Pending",
      });

      currentMinutes = sessionEnd;

      topicIndex = (topicIndex + 1) % specializations.length;

      if (breakAfter.has(i + 1)) {
        currentMinutes += BREAK_DURATION;
      }
    }
  }

  return tasks;
}

export const createPlan = async (req) => {
  const userId = req.user.userId;

  const {
    name,
    duration,
    organizationType,
    learningTrack,
    specializations,
    availableDays,
    availableFrom,
    availableUntil,
  } = req.body;

  const startDate = new Date();
  const months = parseInt(duration);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + months);

  const plan = await StudyPlan.create({
    userId,
    name,
    duration,
    organizationType,
    learningTrack,
    specializations,
    availableDays,
    availableFrom,
    availableUntil,
    startDate,
    endDate,
  });

  const tasks = generateTasksForPlan(plan);
  if (tasks.length) {
    await StudyTask.insertMany(tasks);
  }

  return { plan, totalTasksGenerated: tasks.length };
};

export const getPlans = async (userId) => {
  const plans = await StudyPlan.find({ userId }).sort({ createdAt: -1 }).lean();

  const plansWithCounts = await Promise.all(
    plans.map(async (plan) => {
      const [total, completed] = await Promise.all([
        StudyTask.countDocuments({ planId: plan._id }),
        StudyTask.countDocuments({ planId: plan._id, status: "Completed" }),
      ]);
      return {
        ...plan,
        totalTasks: total,
        completedTasks: completed,
        remaining: total - completed,
        completion: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    }),
  );

  return plansWithCounts;
};

export const getWeeklySchedule = async (userId, weekStart) => {
  const start = weekStart ? new Date(weekStart) : new Date();

  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  const tasks = await StudyTask.find({
    userId,
    scheduledDate: { $gte: start, $lt: end },
  })
    .populate("planId", "name")
    .sort({ scheduledDate: 1, startTime: 1 })
    .lean();

  const schedule = {};
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = dayNames[d.getDay()];
    schedule[key] = {
      date: d.toISOString().split("T")[0],
      dayName: key,
      tasks: [],
    };
  }

  tasks.forEach((task) => {
    const dayKey = dayNames[new Date(task.scheduledDate).getDay()];
    if (schedule[dayKey]) {
      schedule[dayKey].tasks.push(task);
    }
  });

  return {
    weekStart: start.toISOString().split("T")[0],
    weekEnd: new Date(end.getTime() - 86400000).toISOString().split("T")[0],
    schedule,
  };
};

export const getStats = async (userId) => {
  const now = new Date();

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  const startOfLastWeek = new Date(startOfWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

  // This week's tasks
  const weekTasks = await StudyTask.find({
    userId,
    scheduledDate: {
      $gte: startOfWeek,
      $lt: endOfWeek,
    },
  }).lean();

  // Last week's completed tasks
  const lastWeekCompleted = await StudyTask.countDocuments({
    userId,
    scheduledDate: {
      $gte: startOfLastWeek,
      $lt: startOfWeek,
    },
    status: "Completed",
  });

  const totalWeekTasks = weekTasks.length;

  const completedWeekTasks = weekTasks.filter(
    (task) => task.status === "Completed",
  ).length;

  const weeklyProgress =
    totalWeekTasks > 0
      ? Math.round((completedWeekTasks / totalWeekTasks) * 100)
      : 0;

  // Study hours
  let studyMinutes = 0;

  weekTasks
    .filter((task) => task.status === "Completed")
    .forEach((task) => {
      const [sh, sm] = task.startTime.split(":").map(Number);
      const [eh, em] = task.endTime.split(":").map(Number);

      studyMinutes += eh * 60 + em - (sh * 60 + sm);
    });

  const studyHours = Math.floor(studyMinutes / 60);
  const studyMins = studyMinutes % 60;

  const tasksVsLastWeek = completedWeekTasks - lastWeekCompleted;

  return {
    weeklyProgress: {
      percentage: weeklyProgress,
      completed: completedWeekTasks,
      total: totalWeekTasks,
    },

    studyHours: {
      hours: studyHours,
      minutes: studyMins,
      display: `${studyHours}h ${studyMins}m`,
    },

    tasksCompleted: {
      count: completedWeekTasks,
      vsLastWeek: tasksVsLastWeek,
    },
  };
};

export const getTodayFocus = async (userId) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const tasks = await StudyTask.find({
    userId,
    scheduledDate: { $gte: todayStart, $lt: todayEnd },
  })
    .populate("planId", "name")
    .sort({ startTime: 1 })
    .lean();

  return tasks;
};

export const updateTasksStatus = async (ids, userId, updateData) => {
  const { status } = updateData;

  const tasks = await StudyTask.updateMany(
    {
      _id: { $in: ids },
      userId,
    },
    {
      $set: {
        status,
        completedAt:
          status === "Completed" ? new Date() : null,
      },
    },
  );

  const updatedTasks = await StudyTask.find({
    _id: { $in: ids },
    userId,
  })
    .populate("planId", "name")
    .sort({ startTime: 1 })
    .lean();

  return {
    matchedCount: tasks.matchedCount,
    modifiedCount: tasks.modifiedCount,
    tasks: updatedTasks,
  };
};