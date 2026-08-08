
import { getDayKey } from "../../utils/date.js";
import UserActivity from "./users.model.js";
import {
  calculateConsecutiveDays,
  calculateLongestStreak,
  TIME_ZONE,
} from "./users.utils.js";


export const getStreakService = async (userId) => {
  const activities = await UserActivity.find({
    userId,
    solvedProblemIds: {
      $exists: true,
      $ne: [],
    },
  })
    .sort({
      dayKey: -1,
    })
    .select("dayKey solvedProblemIds")
    .lean();

  if (activities.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      activeToday: false,
      lastActiveDate: null,
      todaySolved: 0,
    };
  }

  const now = new Date();

  const todayKey = getDayKey(now, TIME_ZONE);

  const activitySet = new Set(activities.map((activity) => activity.dayKey));

  const todayActivity = activities.find(
    (activity) => activity.dayKey === todayKey,
  );

  const todaySolved = todayActivity?.solvedProblemIds?.length || 0;

  const activeToday = activitySet.has(todayKey);

  let currentStreak = 0;

  const startDate = new Date(now);

  if (!activeToday) {
    startDate.setDate(startDate.getDate() - 1);
  }

  currentStreak = calculateConsecutiveDays(activitySet, startDate);

  const longestStreak = calculateLongestStreak(activitySet);

  return {
    currentStreak,
    longestStreak,
    activeToday,
    lastActiveDate: activities[0]?.dayKey || null,
    todaySolved,
  };
};
