import mongoose from "mongoose";

const LearningPointsSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    learningPoints: [
      {
        type: String,
        required: true,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const LearningPoints = mongoose.model("LearningPoints", LearningPointsSchema);