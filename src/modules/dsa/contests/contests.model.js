import mongoose from "mongoose";

const contestSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      enum: ["LeetCode", "Codeforces", "CodeChef"],
      required: true,
      index: true,
    },
    externalId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    startTime: {
      type: Date,
      required: true,
    },

    endTime: {
      type: Date,
      required: true,
    },

    duration: {
      type: Number,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    registrationUrl: {
      type: String,
      default: null,
    },

    phase: {
      type: String,
      default: null,
    },

    type: {
      type: String,
      default: null,
    },

    lastSyncedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const userContestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    contestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contest",
      required: true,
      index: true,
    },

    platform: {
      type: String,
      enum: ["LeetCode", "Codeforces", "CodeChef"],
      required: true,
    },

    externalId: {
      type: String,
      required: true,
    },

    participated: {
      type: Boolean,
      default: true,
    },

    rank: {
      type: Number,
      default: null,
    },

    ratingBefore: {
      type: Number,
      default: null,
    },

    ratingAfter: {
      type: Number,
      default: null,
    },

    ratingChange: {
      type: Number,
      default: null,
    },

    attendedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

contestSchema.index(
  {
    platform: 1,
    externalId: 1,
  },
  {
    unique: true,
  },
);

contestSchema.index({
  startTime: 1,
});

contestSchema.index({
  endTime: 1,
});

userContestSchema.index(
  {
    userId: 1,
    platform: 1,
    externalId: 1,
  },
  {
    unique: true,
  },
);

userContestSchema.index(
  {
    userId: 1,
    contestId: 1,
  },
  {
    unique: true,
  },
);

userContestSchema.index({
  userId: 1,
  attendedAt: -1,
});

const Contest = mongoose.model("Contest", contestSchema);

const UserContest = mongoose.model("UserContest", userContestSchema);

export { Contest, UserContest };

export default Contest;
