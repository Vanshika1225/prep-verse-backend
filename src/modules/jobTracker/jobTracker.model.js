import mongoose from "mongoose";

export const TRACKER_STATUSES = [
  "Applied",
  "OA / Assessment",
  "Interview",
  "Offer",
  "Rejected",
];

export const WORK_MODES = ["On-site", "Hybrid", "Remote"];

export const DEFAULT_CATEGORIES = [
  "Software Engineering",
  "Frontend Development",
  "Backend Development",
  "Full Stack Development",
  "Mobile Development",
  "DevOps & Cloud",
  "Data & AI",
  "QA & Testing",
  "Product & Design",
];

export function deriveCategory(title = "", skills = []) {
  const text = `${title} ${Array.isArray(skills) ? skills.join(" ") : ""}`.toLowerCase();

  if (/frontend|front[- ]end|react|vue|angular|ui developer|web developer/i.test(text)) {
    return "Frontend Development";
  }
  if (/backend|back[- ]end|node|express|nest|spring|django|fastapi|golang/i.test(text)) {
    return "Backend Development";
  }
  if (/full[- ]stack|fullstack|mern|mean/i.test(text)) {
    return "Full Stack Development";
  }
  if (/mobile|android|ios|flutter|react native|swift|kotlin/i.test(text)) {
    return "Mobile Development";
  }
  if (/devops|cloud|aws|azure|gcp|docker|kubernetes|sre|infrastructure/i.test(text)) {
    return "DevOps & Cloud";
  }
  if (/data|ai|ml|machine learning|deep learning|analytics|analyst/i.test(text)) {
    return "Data & AI";
  }
  if (/qa|quality assurance|sdet|test|tester|automation engineer/i.test(text)) {
    return "QA & Testing";
  }
  if (/product manager|product management|designer|ui\/ux|ux/i.test(text)) {
    return "Product & Design";
  }

  return "Software Engineering";
}

const jobTrackerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      default: null,
    },
    company: { type: String, required: true, trim: true },
    companyLogo: { type: String, default: "" },
    role: { type: String, required: true, trim: true },
    category: { type: String, default: "Engineering", trim: true },
    location: { type: String, default: "India", trim: true },
    workMode: { type: String, enum: WORK_MODES, default: "On-site" },
    status: {
      type: String,
      enum: TRACKER_STATUSES,
      default: "Applied",
      index: true,
    },
    tag: { type: String, default: "New" },
    appliedDate: { type: Date, default: Date.now },
    oaDueDate: { type: Date, default: null },
    oaLink: { type: String, default: "" },

    interviewDate: { type: Date, default: null },
    interviewRound: { type: String, default: "" },
    interviewTime: { type: String, default: "" }, 

    offerDate: { type: Date, default: null },
    offeredSalary: { type: Number, default: null }, 

    rejectedDate: { type: Date, default: null },
    rejectionReason: { type: String, default: "" },

    salary: {
      min: { type: Number, default: null },
      max: { type: Number, default: null },
      currency: { type: String, default: "INR" },
    },

    jobUrl: { type: String, default: "", trim: true },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

jobTrackerSchema.index({ userId: 1, status: 1 });
jobTrackerSchema.index({ userId: 1, appliedDate: -1 });
jobTrackerSchema.index({ userId: 1, interviewDate: 1 });

const jobActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobTracker",
      required: true,
    },
    title: { type: String, required: true },
    role: { type: String, required: true }, 
    company: { type: String, required: true },
    companyLogo: { type: String, default: "" },
    type: {
      type: String,
      enum: [...TRACKER_STATUSES, "Activity"],
      required: true,
    },
  },
  { timestamps: true },
);

jobActivitySchema.index({ userId: 1, createdAt: -1 });

export const JobTracker = mongoose.model("JobTracker", jobTrackerSchema);
export const JobActivity = mongoose.model("JobActivity", jobActivitySchema);
