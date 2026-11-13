import mongoose from "mongoose";
import {
  JobTracker,
  JobActivity,
  TRACKER_STATUSES,
  DEFAULT_CATEGORIES,
  deriveCategory,
} from "./jobTracker.model.js";
import { Job, JobApplication } from "../jobOpenings/jobOpenings.model.js";

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const httpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const getUserFilter = (userId) => {
  if (!userId) return {};
  const isObjectId = mongoose.isValidObjectId(userId);
  const userObjectId = isObjectId ? new mongoose.Types.ObjectId(userId) : null;

  return userObjectId
    ? { $or: [{ userId: String(userId) }, { userId: userObjectId }] }
    : { userId: String(userId) };
};

function formatDate(date) {
  if (!date) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function getStageSubtitle(app) {
  switch (app.status) {
    case "Applied":
      return `Applied on ${formatDate(app.appliedDate)}`;
    case "OA / Assessment":
      return app.oaDueDate
        ? `OA Due ${formatDate(app.oaDueDate)}`
        : "OA Scheduled";
    case "Interview":
      return app.interviewDate
        ? `Next Round ${formatDate(app.interviewDate)}`
        : "Interview in progress";
    case "Offer":
      return `Offered on ${formatDate(app.offerDate || app.updatedAt)}`;
    case "Rejected":
      return `Rejected on ${formatDate(app.rejectedDate || app.updatedAt)}`;
    default:
      return "";
  }
}

function formatTrackerCard(app) {
  return {
    _id: app._id,
    company: app.company,
    companyLogo: app.companyLogo,
    role: app.role,
    category: app.category,
    location: app.location,
    workMode: app.workMode,
    status: app.status,
    tag: app.tag || app.status,
    stageSubtitle: getStageSubtitle(app),
    appliedDate: app.appliedDate,
    oaDueDate: app.oaDueDate,
    oaLink: app.oaLink,
    interviewDate: app.interviewDate,
    interviewRound: app.interviewRound,
    interviewTime: app.interviewTime,
    offerDate: app.offerDate,
    offeredSalary: app.offeredSalary,
    rejectedDate: app.rejectedDate,
    rejectionReason: app.rejectionReason,
    salary: app.salary,
    jobUrl: app.jobUrl,
    notes: app.notes,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
  };
}

export const syncFromJobApplications = async (userId) => {
  try {
    if (!userId) return;
    const userFilter = getUserFilter(userId);

    const appliedJobs = await JobApplication.find(userFilter).lean();

    for (const app of appliedJobs) {
      if (!app.jobId) continue;

      const jobIdStr = String(app.jobId._id || app.jobId);
      const jobIdObj = mongoose.isValidObjectId(jobIdStr)
        ? new mongoose.Types.ObjectId(jobIdStr)
        : null;

      const exists = await JobTracker.findOne({
        ...userFilter,
        $or: [{ jobId: jobIdStr }, ...(jobIdObj ? [{ jobId: jobIdObj }] : [])],
      });

      if (exists) continue;

      const job = await Job.findById(jobIdObj || jobIdStr).lean();
      const company = job?.company || "Company";
      const role = job?.title || "Software Developer";
      const location = job?.city || job?.location || "India";
      const workMode = job?.workMode || "On-site";
      const salary = {
        min: job?.salaryMin ?? null,
        max: job?.salaryMax ?? null,
        currency: job?.currency || "INR",
      };
      const jobUrl = job?.applyUrl || "";

      const trackerStatus =
        app.status === "Interviewing"
          ? "Interview"
          : TRACKER_STATUSES.includes(app.status)
            ? app.status
            : "Applied";

      const appliedDate =
        app.appliedAt || app.clickedAt || app.createdAt || new Date();

      const userTargetId = mongoose.isValidObjectId(userId)
        ? new mongoose.Types.ObjectId(userId)
        : userId;

      const newTracker = await JobTracker.create({
        userId: userTargetId,
        jobId: jobIdObj || jobIdStr,
        company,
        companyLogo: job?.companyLogo || "",
        role,
        category: deriveCategory(job?.title || role, job?.skills || []),
        location,
        workMode,
        status: trackerStatus,
        tag: trackerStatus === "Applied" ? "New" : trackerStatus,
        appliedDate,
        salary,
        jobUrl,
        notes: app.notes || "",
      });

      await JobActivity.create({
        userId: userTargetId,
        applicationId: newTracker._id,
        company,
        companyLogo: job?.companyLogo || "",
        role,
        title: `Applied to ${company}`,
        type: "Applied",
        createdAt: appliedDate,
      });
    }
  } catch (err) {
    console.error("Error auto-syncing from JobApplication:", err);
  }
};

export const getApplications = async (userId, query = {}) => {
  await syncFromJobApplications(userId);

  const { search, category, location, status } = query;
  const userFilter = getUserFilter(userId);
  const and = [userFilter];

  if (search?.trim()) {
    const regex = new RegExp(escapeRegex(search.trim()), "i");
    and.push({
      $or: [{ company: regex }, { role: regex }, { notes: regex }],
    });
  }

  if (category && category !== "All" && category !== "All Categories") {
    and.push({
      category: new RegExp(`^${escapeRegex(category.trim())}$`, "i"),
    });
  }

  if (location && location !== "All" && location !== "All Locations") {
    const regex = new RegExp(escapeRegex(location.trim()), "i");
    and.push({ location: regex });
  }

  if (status && status !== "All" && status !== "All Status") {
    and.push({ status });
  }

  const filter = and.length > 1 ? { $and: and } : userFilter;

  const applications = await JobTracker.find(filter)
    .sort({ updatedAt: -1 })
    .lean();

  const formatted = applications.map(formatTrackerCard);

  const columns = {
    applied: { title: "Applied", count: 0, items: [] },
    oa: { title: "OA / Assessment", count: 0, items: [] },
    interview: { title: "Interview", count: 0, items: [] },
    offer: { title: "Offer", count: 0, items: [] },
    rejected: { title: "Rejected", count: 0, items: [] },
  };

  formatted.forEach((item) => {
    switch (item.status) {
      case "Applied":
        columns.applied.items.push(item);
        break;
      case "OA / Assessment":
        columns.oa.items.push(item);
        break;
      case "Interview":
        columns.interview.items.push(item);
        break;
      case "Offer":
        columns.offer.items.push(item);
        break;
      case "Rejected":
        columns.rejected.items.push(item);
        break;
      default:
        columns.applied.items.push(item);
        break;
    }
  });

  columns.applied.count = columns.applied.items.length;
  columns.oa.count = columns.oa.items.length;
  columns.interview.count = columns.interview.items.length;
  columns.offer.count = columns.offer.items.length;
  columns.rejected.count = columns.rejected.items.length;

  return {
    totalApplications: formatted.length,
    columns,
    applications: formatted,
  };
};

export const getApplicationStats = async (userId, timeRange) => {
  await syncFromJobApplications(userId);

  const userFilter = getUserFilter(userId);
  const filter = { ...userFilter };

  if (timeRange === "month" || timeRange === "this-month") {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    filter.createdAt = { $gte: startOfMonth };
  }

  const applications = await JobTracker.find(filter).lean();

  const map = {
    Applied: 0,
    "OA / Assessment": 0,
    Interview: 0,
    Offer: 0,
    Rejected: 0,
  };

  applications.forEach((app) => {
    if (map[app.status] !== undefined) {
      map[app.status]++;
    } else if (app.status === "Interviewing") {
      map["Interview"]++;
    } else {
      map["Applied"]++;
    }
  });

  const total = applications.length;
  const calculatePct = (count) =>
    total > 0 ? parseFloat(((count / total) * 100).toFixed(1)) : 0;

  return {
    overview: {
      totalApplications: total,
      interviews: map.Interview,
      offers: map.Offer,
      rejections: map.Rejected,
    },
    progress: {
      total,
      breakdown: [
        {
          status: "Applied",
          count: map.Applied,
          percentage: calculatePct(map.Applied),
        },
        {
          status: "OA",
          count: map["OA / Assessment"],
          percentage: calculatePct(map["OA / Assessment"]),
        },
        {
          status: "Interview",
          count: map.Interview,
          percentage: calculatePct(map.Interview),
        },
        {
          status: "Offer",
          count: map.Offer,
          percentage: calculatePct(map.Offer),
        },
        {
          status: "Rejected",
          count: map.Rejected,
          percentage: calculatePct(map.Rejected),
        },
      ],
    },
  };
};

export const getUpcomingInterviews = async (userId) => {
  const userFilter = getUserFilter(userId);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const interviews = await JobTracker.find({
    ...userFilter,
    status: "Interview",
    interviewDate: { $gte: now },
  })
    .sort({ interviewDate: 1 })
    .limit(5)
    .lean();

  return interviews.map((item) => ({
    _id: item._id,
    company: item.company,
    companyLogo: item.companyLogo,
    role: item.role,
    round: item.interviewRound || "Round 1",
    interviewDate: item.interviewDate,
    interviewTime: item.interviewTime || "",
    displayDate: item.interviewTime
      ? `${formatDate(item.interviewDate)}, ${item.interviewTime}`
      : formatDate(item.interviewDate),
  }));
};

export const getRecentActivity = async (userId) => {
  const userFilter = getUserFilter(userId);
  return JobActivity.find(userFilter).sort({ createdAt: -1 }).limit(3).lean();
};

export const getFilterOptions = async (userId) => {
  const userFilter = getUserFilter(userId);
  const [userCategories, locations] = await Promise.all([
    JobTracker.distinct("category", userFilter),
    JobTracker.distinct("location", userFilter),
  ]);

  const categories = [
    ...new Set([...DEFAULT_CATEGORIES, ...userCategories.filter(Boolean)]),
  ].sort();

  return {
    categories,
    locations: locations.filter(Boolean).sort(),
    statuses: TRACKER_STATUSES,
  };
};

export const createApplication = async (userId, data) => {
  const userTargetId = mongoose.isValidObjectId(userId)
    ? new mongoose.Types.ObjectId(userId)
    : userId;

  const category = data.category || deriveCategory(data.role || "");
  const status = data.status || "Applied";

  let defaultTag = "New";
  if (status === "OA / Assessment") defaultTag = "OA";
  else if (status === "Interview") defaultTag = "Interview";
  else if (status === "Offer") defaultTag = "Offer";
  else if (status === "Rejected") defaultTag = "Rejected";

  const application = await JobTracker.create({
    userId: userTargetId,
    company: data.company,
    companyLogo: data.companyLogo || "",
    role: data.role,
    category,
    location: data.location || "India",
    workMode: data.workMode || "On-site",
    status,
    tag: data.tag || defaultTag,
    appliedDate: data.appliedDate || new Date(),
    oaDueDate: data.oaDueDate || null,
    oaLink: data.oaLink || "",
    interviewDate: data.interviewDate || null,
    interviewRound: data.interviewRound || "",
    interviewTime: data.interviewTime || "",
    offerDate: data.offerDate || null,
    offeredSalary: data.offeredSalary || null,
    rejectedDate: data.rejectedDate || null,
    rejectionReason: data.rejectionReason || "",
    salary: data.salary || {},
    jobUrl: data.jobUrl || "",
    notes: data.notes || "",
  });

  let activityTitle = `Applied to ${application.company}`;
  if (status === "OA / Assessment") {
    activityTitle = `${application.company} OA assessment link received`;
  } else if (status === "Interview") {
    activityTitle = `${application.company} scheduled ${application.interviewRound || "Round 1"} interview`;
  } else if (status === "Offer") {
    activityTitle = `Received offer from ${application.company}`;
  } else if (status === "Rejected") {
    activityTitle = `Application at ${application.company} marked as Rejected`;
  }

  await JobActivity.create({
    userId: userTargetId,
    applicationId: application._id,
    company: application.company,
    companyLogo: application.companyLogo,
    role: application.role,
    title: activityTitle,
    type: application.status,
  });

  return formatTrackerCard(application);
};

export const getApplicationById = async (id, userId) => {
  const userFilter = getUserFilter(userId);
  const app = await JobTracker.findOne({ _id: id, ...userFilter }).lean();
  if (!app) return null;
  return formatTrackerCard(app);
};

export const updateApplication = async (id, userId, data) => {
  const userFilter = getUserFilter(userId);
  const app = await JobTracker.findOne({ _id: id, ...userFilter });
  if (!app) return null;

  const previousStatus = app.status;
  Object.assign(app, data);

  if (data.status && data.status !== previousStatus && !data.tag) {
    app.tag = data.status === "OA / Assessment" ? "OA" : data.status;
  }

  await app.save();

  if (data.status && data.status !== previousStatus) {
    await recordStatusActivity(userId, app);
  }

  return formatTrackerCard(app);
};

export const updateApplicationStatus = async (
  id,
  userId,
  { status, details = {} },
) => {
  if (!TRACKER_STATUSES.includes(status)) {
    throw httpError(
      400,
      `Invalid status. Must be one of: ${TRACKER_STATUSES.join(", ")}`,
    );
  }

  const userFilter = getUserFilter(userId);
  const app = await JobTracker.findOne({ _id: id, ...userFilter });
  if (!app) return null;

  app.status = status;
  app.tag = status === "OA / Assessment" ? "OA" : status;

  if (status === "OA / Assessment") {
    if (details.oaDueDate) app.oaDueDate = details.oaDueDate;
    if (details.oaLink) app.oaLink = details.oaLink;
  } else if (status === "Interview") {
    if (details.interviewDate) app.interviewDate = details.interviewDate;
    if (details.interviewRound) app.interviewRound = details.interviewRound;
    if (details.interviewTime) app.interviewTime = details.interviewTime;
  } else if (status === "Offer") {
    app.offerDate = details.offerDate || new Date();
    if (details.offeredSalary) app.offeredSalary = details.offeredSalary;
  } else if (status === "Rejected") {
    app.rejectedDate = details.rejectedDate || new Date();
    if (details.rejectionReason) app.rejectionReason = details.rejectionReason;
  }

  await app.save();
  await recordStatusActivity(userId, app);

  return formatTrackerCard(app);
};

export const deleteApplication = async (id, userId) => {
  const userFilter = getUserFilter(userId);
  const deleted = await JobTracker.findOneAndDelete({ _id: id, ...userFilter });
  if (deleted) {
    await JobActivity.deleteMany({ applicationId: id });
  }
  return deleted;
};

async function recordStatusActivity(userId, app) {
  let title = `Status updated to ${app.status}`;
  if (app.status === "Interview") {
    title = `${app.company} scheduled ${app.interviewRound || "an"} interview`;
  } else if (app.status === "Offer") {
    title = `You moved to Offer stage`;
  } else if (app.status === "OA / Assessment") {
    title = `${app.company} OA assessment link received`;
  } else if (app.status === "Rejected") {
    title = `Application status updated to Rejected`;
  }

  const userTargetId = mongoose.isValidObjectId(userId)
    ? new mongoose.Types.ObjectId(userId)
    : userId;

  await JobActivity.create({
    userId: userTargetId,
    applicationId: app._id,
    company: app.company,
    companyLogo: app.companyLogo,
    role: app.role,
    title,
    type: app.status,
  });
}
