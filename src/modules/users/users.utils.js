import { getDayKey } from "../../utils/date.js";

export const TIME_ZONE = "Asia/Kolkata";

export const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const ACTIVITY_FIELDS = [
  "solvedProblemIds",
  "jobApplicationIds",
  "completedPlannerTaskIds",
  "completedMilestoneIds",
];

const parseDayKey = (dayKey) => {
  const [year, month, day] = dayKey.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day));
};

export const calculateConsecutiveDays = (activitySet, startDate) => {
  let streak = 0;

  const currentDate = new Date(startDate);

  while (true) {
    const dayKey = getDayKey(currentDate, TIME_ZONE);

    if (!activitySet.has(dayKey)) {
      break;
    }

    streak++;
    currentDate.setTime(currentDate.getTime() - ONE_DAY_MS);
  }

  return streak;
};

export const calculateLongestStreak = (activitySet) => {
  const days = Array.from(activitySet).sort();

  if (days.length === 0) {
    return 0;
  }

  let longest = 1;
  let current = 1;

  for (let i = 1; i < days.length; i++) {
    const previousDate = parseDayKey(days[i - 1]);

    const currentDate = parseDayKey(days[i]);

    const difference = Math.round((currentDate - previousDate) / ONE_DAY_MS);

    if (difference === 1) {
      current++;

      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
};
