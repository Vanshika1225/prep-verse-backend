import mongoose from "mongoose";

export const PLAN_DURATIONS = ["3 Months", "6 Months", "9 Months"];
export const ORGANIZATION_TYPES = ["Daily", "Weekly", "Monthly"];
export const TASK_STATUSES = ["Pending", "In Progress", "Completed", "Skipped"];
export const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const studyPlanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    duration: {
      type: String,
      enum: PLAN_DURATIONS,
      required: true,
    },
    organizationType: {
      type: String,
      enum: ORGANIZATION_TYPES,
      required: true,
    },
    learningTrack: {
      type: String,
      required: true,
      trim: true,
    },
    specializations: [{ type: String, trim: true }],
    availableDays: [
      {
        type: String,
        enum: DAYS_OF_WEEK,
      },
    ],
    availableFrom: {
      type: String, 
      required: true,
    },
    availableUntil: {
      type: String, 
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

studyPlanSchema.index({ userId: 1 });

const studyTaskSchema = new mongoose.Schema(
  {
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudyPlan",
      required: true,
    },
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
    scheduledDate: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String, 
      required: true,
    },
    status: {
      type: String,
      enum: TASK_STATUSES,
      default: "Pending",
    },
    topic: {
      type: String,
      trim: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

studyTaskSchema.index({ userId: 1, scheduledDate: 1 });
studyTaskSchema.index({ planId: 1 });
studyTaskSchema.index({ userId: 1, status: 1 });

const StudyPlan = mongoose.model("StudyPlan", studyPlanSchema);
const StudyTask = mongoose.model("StudyTask", studyTaskSchema);

export { StudyPlan, StudyTask };
