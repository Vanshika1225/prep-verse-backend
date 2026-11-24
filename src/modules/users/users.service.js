import { getDayKey } from "../../utils/date.js";
import User from "../auth/auth.model.js";
import { UserActivity, UserProfile } from "./users.model.js";
import {
  ACTIVITY_FIELDS,
  calculateConsecutiveDays,
  calculateLongestStreak,
  ONE_DAY_MS,
  TIME_ZONE,
} from "./users.utils.js";

export const getProfileService = async (userId) => {
  const profile = await UserProfile.findOne({ userId });

  if (!profile) {
    const error = new Error("Profile not found");
    error.statusCode = 404;
    throw error;
  }

  const user = await User.findById(userId).select("email provider");

  return {
    ...profile.toObject(),
    email: user?.email,
    provider: user?.provider,
  };
};

const MAX_AVATAR_LENGTH = 200_000;

export const updateProfileService = async (userId, data) => {
  const allowedFields = [
    "name",
    "phone",
    "avatar",
    "bio",
    "country",
    "city",
    "leetcodeHandle",
    "codeforcesHandle",
    "codechefHandle",
  ];

  const updates = {};
  allowedFields.forEach((field) => {
    if (data[field] !== undefined) updates[field] = data[field];
  });

  // avatar: null removes the photo, otherwise it must be a small image data URL
  if (updates.avatar !== undefined && updates.avatar !== null) {
    const isImage =
      typeof updates.avatar === "string" &&
      updates.avatar.startsWith("data:image/");

    if (!isImage) {
      const error = new Error("Invalid profile picture");
      error.statusCode = 400;
      throw error;
    }

    if (updates.avatar.length > MAX_AVATAR_LENGTH) {
      const error = new Error("Profile picture is too large");
      error.statusCode = 413;
      throw error;
    }
  }

  const profile = await UserProfile.findOneAndUpdate({ userId }, updates, {
    new: true,
    runValidators: true,
  });

  if (!profile) {
    const error = new Error("Profile not found");
    error.statusCode = 404;
    throw error;
  }

  return profile;
};

export const recordActivityService = async (userId, field, itemIds) => {
  if (!ACTIVITY_FIELDS.includes(field)) {
    throw new Error(`Invalid activity field: ${field}`);
  }

  const ids = Array.isArray(itemIds) ? itemIds : [itemIds];
  if (ids.length === 0) return null;

  const now = new Date();
  const dayKey = getDayKey(now, TIME_ZONE);

  const run = () =>
    UserActivity.findOneAndUpdate(
      { userId, dayKey },
      {
        $setOnInsert: { activityAt: now },
        $addToSet: { [field]: { $each: ids } },
      },
      { upsert: true, new: true },
    );

  try {
    return await run();
  } catch (error) {
    // do requests ek saath upsert karein to duplicate key aa sakti hai, ek baar retry
    if (error.code === 11000) return run();
    throw error;
  }
};

export const removeActivityService = async (userId, field, itemIds, date) => {
  if (!ACTIVITY_FIELDS.includes(field)) {
    throw new Error(`Invalid activity field: ${field}`);
  }

  const ids = Array.isArray(itemIds) ? itemIds : [itemIds];
  const dayKey = getDayKey(date ? new Date(date) : new Date(), TIME_ZONE);

  const doc = await UserActivity.findOneAndUpdate(
    { userId, dayKey },
    { $pull: { [field]: { $in: ids } } },
    { new: true },
  );

  if (!doc) return null;

  const isEmpty = ACTIVITY_FIELDS.every((f) => !doc[f] || doc[f].length === 0);

  if (isEmpty) {
    await UserActivity.deleteOne({ _id: doc._id });
  }

  return doc;
};

export const getStreakService = async (userId) => {
  const activityQuery = {
    userId,
    $or: ACTIVITY_FIELDS.map((field) => ({
      [`${field}.0`]: { $exists: true },
    })),
  };

  const activities = await UserActivity.find(activityQuery)
    .sort({ dayKey: -1 })
    .select(`dayKey ${ACTIVITY_FIELDS.join(" ")}`)
    .lean();

  if (activities.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      activeToday: false,
      lastActiveDate: null,
      todaySolved: 0,
      todayJobsApplied: 0,
      todayPlannerDone: 0,
    };
  }

  const now = new Date();
  const todayKey = getDayKey(now, TIME_ZONE);

  const activitySet = new Set(activities.map((a) => a.dayKey));

  const todayActivity = activities.find((a) => a.dayKey === todayKey);

  const todaySolved = todayActivity?.solvedProblemIds?.length || 0;
  const todayJobsApplied = todayActivity?.jobApplicationIds?.length || 0;
  const todayPlannerDone = todayActivity?.completedPlannerTaskIds?.length || 0;

  const activeToday = activitySet.has(todayKey);

  // Agar aaj activity nahi hui to kal se count shuru karo (streak abhi tootti nahi)
  const startDate = new Date(now);
  if (!activeToday) {
    startDate.setTime(startDate.getTime() - ONE_DAY_MS);
  }

  const currentStreak = calculateConsecutiveDays(activitySet, startDate);
  const longestStreak = calculateLongestStreak(activitySet);

  return {
    currentStreak,
    longestStreak,
    activeToday,
    lastActiveDate: activities[0]?.dayKey || null,
    todaySolved,
    todayJobsApplied,
    todayPlannerDone,
  };
};
