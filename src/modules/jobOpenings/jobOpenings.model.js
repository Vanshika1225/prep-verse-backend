import mongoose from "mongoose";

export const JOB_TYPES = ["Full Time", "Part Time", "Internship", "Contract"];

export const WORK_MODES = ["On-site", "Hybrid", "Remote"];

export const APPLICATION_STATUSES = [
  "Pending",
  "Applied",
  "Interviewing",
  "Offer",
  "Rejected",
  "Withdrawn",
];

const jobSchema = new mongoose.Schema(
  {
    source: { type: String, required: true, default: "jsearch" },
    externalId: { type: String, required: true },
    publisher: { type: String, default: "" },
    lastSyncedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null },

    title: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    companyLogo: { type: String, default: "" },
    location: { type: String, default: "India", trim: true },
    city: { type: String, default: "", trim: true },
    workMode: { type: String, enum: WORK_MODES, default: "On-site" },
    jobType: { type: String, enum: JOB_TYPES, default: "Full Time" },

    experienceMin: { type: Number, default: null, min: 0 },

    salaryMin: { type: Number, default: null, min: 0 },
    salaryMax: { type: Number, default: null, min: 0 },
    currency: { type: String, default: "INR" },

    description: { type: String, default: "" },
    requirements: [{ type: String, trim: true }],
    skills: [{ type: String, trim: true }],
    applyUrl: { type: String, required: true, trim: true },
    openings: { type: Number, default: 1, min: 1 },
    applicationsCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    postedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

jobSchema.index({ source: 1, externalId: 1 }, { unique: true });
jobSchema.index({ isActive: 1, postedAt: -1 });
jobSchema.index({ company: 1, isActive: 1 });
jobSchema.index({ skills: 1 });
jobSchema.index({ city: 1, workMode: 1, jobType: 1 });
jobSchema.index({ lastSyncedAt: 1 });

const jobApplicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    status: { type: String, enum: APPLICATION_STATUSES, default: "Pending" },
    clickedAt: { type: Date, default: Date.now },
    appliedAt: { type: Date, default: null },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

jobApplicationSchema.index({ userId: 1, jobId: 1 }, { unique: true });
jobApplicationSchema.index({ userId: 1, status: 1, clickedAt: -1 });
jobApplicationSchema.index({ userId: 1, appliedAt: -1 });

const Job = mongoose.model("Job", jobSchema);
const JobApplication = mongoose.model("JobApplication", jobApplicationSchema);

export { Job, JobApplication };
