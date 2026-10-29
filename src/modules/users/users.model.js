import mongoose from "mongoose";

const userProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      default: null,
      trim: true,
    },

    avatar: {
      type: String,
      default: null,
    },

    bio: {
      type: String,
      default: "",
      trim: true,
      maxlength: 300,
    },

    country: {
      type: String,
      default: null,
      trim: true,
    },

    city: {
      type: String,
      default: null,
      trim: true,
    },

    leetcodeHandle: {
      type: String,
      default: null,
      trim: true,
    },

    codeforcesHandle: {
      type: String,
      default: null,
      trim: true,
    },

    codechefHandle: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

const userActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    dayKey: {
      type: String,
      required: true,
    },

    activityAt: {
      type: Date,
      required: true,
    },

    solvedProblemIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Problem",
      },
    ],
  },
  {
    timestamps: true,
  },
);

userActivitySchema.index(
  {
    userId: 1,
    dayKey: 1,
  },
  {
    unique: true,
  },
);

const UserProfile = mongoose.model("UserProfile", userProfileSchema);

const UserActivity = mongoose.model("UserActivity", userActivitySchema);

export { UserProfile, UserActivity };
