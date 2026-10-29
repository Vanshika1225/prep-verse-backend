import mongoose from "mongoose";

export const DIFFICULTY_LEVELS = ["Beginner", "Intermediate", "Advanced"];
export const ROADMAP_STATUSES = ["Not Started", "In Progress", "Completed"];
export const MILESTONE_STATUSES = ["Pending", "Completed"];

const milestoneSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: "",
  },
  estimatedHours: {
    type: Number,
    default: 1,
    min: 0,
  },
  status: {
    type: String,
    enum: MILESTONE_STATUSES,
    default: "Pending",
  },
  dueDate: {
    type: Date,
    default: null,
  },
  completedAt: {
    type: Date,
    default: null,
  },
});

const roadmapSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    difficulty: {
      type: String,
      enum: DIFFICULTY_LEVELS,
      default: "Beginner",
    },
    topics: [{ type: String, trim: true }],
    hoursPerWeek: {
      type: Number,
      default: 6,
      min: 1,
      max: 80,
    },
    milestones: {
      type: [milestoneSchema],
      validate: [
        (value) => value.length > 0,
        "At least one milestone is required.",
      ],
    },
    status: {
      type: String,
      enum: ROADMAP_STATUSES,
      default: "Not Started",
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

roadmapSchema.index({ userId: 1, createdAt: -1 });
roadmapSchema.index({ userId: 1, status: 1 });

const Roadmap = mongoose.model("Roadmap", roadmapSchema);

export { Roadmap };