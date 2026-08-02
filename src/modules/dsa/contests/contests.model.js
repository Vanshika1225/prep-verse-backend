import mongoose from "mongoose";

const contestSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      enum: ["LeetCode", "Codeforces", "CodeChef"],
      required: true,
    },
    externalId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: { type: Date, required: true },
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
    },
    phase: { type: String },
    type: { type: String },
    lastSyncedAt: { type: Date },
  },
  {
    timestamp: true,
  },
);

contestSchema.index =
  ({
    platform: 1,
    externalId: 1,
  },
  {
    unique: true,
  });

contestSchema.index = {
  startTime: 1,
};

const ContestList = mongoose.model("Contest", contestSchema);
export default ContestList;
