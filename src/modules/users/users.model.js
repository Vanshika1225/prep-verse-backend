import mongoose from "mongoose";

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

const UserActivity = mongoose.model(
  "UserActivity",
  userActivitySchema,
);

export default UserActivity;