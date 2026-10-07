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

  if (!specializations.length || !availableDays.length) return tasks;

  const start = new Date(startDate);
  const end = new Date(endDate);
  const allowedDays = availableDays.map((d) => DAY_MAP[d]);

  const [fromH, fromM] = availableFrom.split(":").map(Number);
  const [untilH, untilM] = availableUntil.split(":").map(Number);
  const totalMinutes = untilH * 60 + untilM - (fromH * 60 + fromM);
  const slotDuration = Math.max(
    30,
    Math.floor(totalMinutes / specializations.length),
  );

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (!allowedDays.includes(d.getDay())) continue;

    let currentMinutes = fromH * 60 + fromM;

    for (const topic of specializations) {
      if (currentMinutes + slotDuration > untilH * 60 + untilM) break;

      const startTimeStr = `${String(Math.floor(currentMinutes / 60)).padStart(2, "0")}:${String(currentMinutes % 60).padStart(2, "0")}`;
      const endMinutes = currentMinutes + slotDuration;
      const endTimeStr = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;

      tasks.push({
        planId: plan._id,
        userId: plan.userId,
        title: topic,
        scheduledDate: new Date(d),
        startTime: startTimeStr,
        endTime: endTimeStr,
        topic,
        status: "Pending",
      });

      currentMinutes = endMinutes;
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

export const updateTaskStatus = async (taskId, userId, updateData) => {
  const update = { status: updateData.status };

  if (updateData.status === "Completed") {
    update.completedAt = new Date();
  } else {
    update.completedAt = null;
  }

  const task = await StudyTask.findOneAndUpdate(
    { _id: taskId, userId },
    { $set: update },
    { new: true, runValidators: true },
  );

  if (!task) {
    throw new Error("Task not found");
  }

  return task;
};
