import { Job, JobApplication } from "./jobOpenings.model.js";

const SORT_OPTIONS = {
  recent: { postedAt: -1 },
  "salary-high": { salaryMax: -1, postedAt: -1 },
  "salary-low": { salaryMin: 1, postedAt: -1 },
  experience: { experienceMin: 1, postedAt: -1 },
};

const NEW_JOB_WINDOW_MS = 24 * 60 * 60 * 1000;
const PENDING_EXPIRY_MS = 3 * 24 * 60 * 60 * 1000; 

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toList = (value) =>
  String(value || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

const httpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

function formatExperience(min) {
  if (min === null || min === undefined) return "Not specified";
  if (min === 0) return "Fresher";
  return `${min}+ Yrs`;
}

function formatSalary(job) {
  if (!job.salaryMin && !job.salaryMax) return "Not disclosed";
  if (job.salaryMin === job.salaryMax) return `₹${job.salaryMax} LPA`;
  return `₹${job.salaryMin} – ${job.salaryMax} LPA`;
}

function formatJob(job, { appliedIds = new Set() } = {}) {
  return {
    _id: job._id,
    title: job.title,
    company: job.company,
    companyLogo: job.companyLogo,
    location: job.location,
    workMode: job.workMode,
    jobType: job.jobType,
    publisher: job.publisher,
    experience: {
      min: job.experienceMin ?? null,
      display: formatExperience(job.experienceMin),
    },
    salary: {
      min: job.salaryMin ?? null,
      max: job.salaryMax ?? null,
      currency: job.currency,
      display: formatSalary(job),
    },
    description: job.description,
    requirements: job.requirements,
    skills: job.skills,
    openings: job.openings,
    applicationsCount: job.applicationsCount,
    isNew: Date.now() - new Date(job.postedAt).getTime() < NEW_JOB_WINDOW_MS,
    isApplied: appliedIds.has(String(job._id)),
    postedAt: job.postedAt,
  };
}

async function getAppliedFlags(userId, jobIds) {
  const applied = await JobApplication.find({
    userId,
    jobId: { $in: jobIds },
    status: { $ne: "Pending" },
  })
    .select("jobId")
    .lean();

  return { appliedIds: new Set(applied.map((a) => String(a.jobId))) };
}

function parseExperience(value) {
  if (!value || value === "All") return null;

  if (value.endsWith("+")) {
    const min = Number(value.replace("+", ""));
    return Number.isNaN(min) ? null : { min, max: Infinity };
  }

  const [min, max] = value.split("-").map(Number);
  if (Number.isNaN(min) || Number.isNaN(max)) return null;

  return { min, max };
}

function buildJobFilter(query) {
  const {
    search,
    location,
    experience,
    jobType,
    workMode,
    entryLevel,
    minSalary,
    maxSalary,
    company,
    skills,
    sort,
  } = query;

  const filter = { isActive: true };
  const and = [];

  if (search?.trim()) {
    const regex = new RegExp(escapeRegex(search.trim()), "i");
    and.push({
      $or: [{ title: regex }, { company: regex }, { skills: regex }],
    });
  }

  if (location && location !== "All") {
    const regex = new RegExp(escapeRegex(location.trim()), "i");
    and.push({ $or: [{ city: regex }, { location: regex }] });
  }

  if (company) {
    filter.company = new RegExp(`^${escapeRegex(company.trim())}$`, "i");
  }

  const jobTypes = toList(jobType).filter((v) => v !== "All");
  if (jobTypes.length) filter.jobType = { $in: jobTypes };

  const workModes = [
    ...new Set(
      toList(workMode).map((m) => (m === "Work From Home" ? "Remote" : m)),
    ),
  ];
  if (workModes.length) filter.workMode = { $in: workModes };

  const skillList = toList(skills);
  if (skillList.length) {
    filter.skills = {
      $in: skillList.map((s) => new RegExp(`^${escapeRegex(s)}$`, "i")),
    };
  }

  const range = parseExperience(experience);
  if (range) {
    and.push({
      experienceMin: {
        $gte: range.min,
        ...(Number.isFinite(range.max) ? { $lte: range.max } : {}),
      },
    });
  }

  if (entryLevel === "true") {
    and.push({ experienceMin: { $lte: 1 } });
  }

  if (minSalary && !Number.isNaN(Number(minSalary))) {
    and.push({ salaryMax: { $gte: Number(minSalary) } });
  }
  if (maxSalary && !Number.isNaN(Number(maxSalary))) {
    and.push({ salaryMin: { $lte: Number(maxSalary) } });
  }

  if (sort === "salary-high" || sort === "salary-low") {
    and.push({ salaryMax: { $ne: null } });
  }

  if (and.length) filter.$and = and;

  return filter;
}

export const getJobs = async (userId, query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 50);
  const sort = SORT_OPTIONS[query.sort] || SORT_OPTIONS.recent;

  const filter = buildJobFilter(query);

  const [jobs, total] = await Promise.all([
    Job.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Job.countDocuments(filter),
  ]);

  const flags = await getAppliedFlags(
    userId,
    jobs.map((j) => j._id),
  );

  return {
    jobs: jobs.map((job) => formatJob(job, flags)),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      from: total === 0 ? 0 : (page - 1) * limit + 1,
      to: Math.min(page * limit, total),
    },
  };
};

export const getJobById = async (id, userId) => {
  const job = await Job.findOne({ _id: id, isActive: true }).lean();
  if (!job) return null;

  const flags = await getAppliedFlags(userId, [job._id]);
  return formatJob(job, flags);
};

export const getRecommendedJobs = async (userId) => {
  const applications = await JobApplication.find({ userId })
    .select("jobId status")
    .lean();

  const interactedIds = applications.map((a) => a.jobId);
  const appliedJobIds = applications
    .filter((a) => a.status !== "Pending")
    .map((a) => a.jobId);

  const appliedJobs = await Job.find({ _id: { $in: appliedJobIds } })
    .select("skills")
    .lean();

  const skills = [...new Set(appliedJobs.flatMap((j) => j.skills))];

  let jobs = [];

  if (skills.length) {
    jobs = await Job.find({
      isActive: true,
      _id: { $nin: interactedIds },
      skills: { $in: skills },
    })
      .sort({ postedAt: -1 })
      .limit(3)
      .lean();
  }

  if (jobs.length < 3) {
    const excludeIds = [...interactedIds, ...jobs.map((j) => j._id)];
    const extra = await Job.find({ isActive: true, _id: { $nin: excludeIds } })
      .sort({ postedAt: -1 })
      .limit(3 - jobs.length)
      .lean();
    jobs = [...jobs, ...extra];
  }

  const flags = await getAppliedFlags(
    userId,
    jobs.map((j) => j._id),
  );

  return jobs.map((job) => formatJob(job, flags));
};

export const getTopCompanies = async () => {
  const companies = await Job.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: { $toLower: "$company" },
        company: { $first: "$company" },
        companyLogo: { $first: "$companyLogo" },
        openings: { $sum: 1 },
      },
    },
    { $sort: { openings: -1 } },
    { $limit: 5 },
  ]);

  return companies.map((c) => ({
    company: c.company,
    companyLogo: c.companyLogo,
    openings: c.openings,
  }));
};

export const getPopularSkills = async () => {
  const skills = await Job.aggregate([
    { $match: { isActive: true } },
    { $unwind: "$skills" },
    {
      $group: {
        _id: { $toLower: "$skills" },
        name: { $first: "$skills" },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  return skills.map((s) => ({ name: s.name, count: s.count }));
};

export const getFilterOptions = async () => {
  const [cities, companies] = await Promise.all([
    Job.distinct("city", { isActive: true }),
    Job.distinct("company", { isActive: true }),
  ]);

  return {
    locations: cities.filter(Boolean).sort(),
    companies: companies.sort(),
    experience: ["0-1", "1-3", "3-5", "5+"],
    jobTypes: ["Full Time", "Part Time", "Internship", "Contract"],
    workModes: ["On-site", "Hybrid", "Remote", "Work From Home"],
    sortOptions: [
      { value: "recent", label: "Most Recent" },
      { value: "salary-high", label: "Salary: High to Low" },
      { value: "salary-low", label: "Salary: Low to High" },
      { value: "experience", label: "Experience: Low to High" },
    ],
  };
};


// Step 1: user clicked "Apply Now" -> record intent, return the external URL
export const startApply = async (jobId, userId) => {
  const job = await Job.findOne({ _id: jobId, isActive: true })
    .select("applyUrl")
    .lean();
  if (!job) return null;

  const existing = await JobApplication.findOne({ userId, jobId });

  if (existing && existing.status !== "Pending") {
    throw httpError(409, "You have already applied to this job.");
  }

  if (existing) {
    existing.clickedAt = new Date();
    await existing.save();
  } else {
    await JobApplication.create({ userId, jobId, status: "Pending" });
  }

  return { jobId, applyUrl: job.applyUrl, status: "Pending" };
};

// Step 2: user came back -> which jobs should we ask about?
export const getPendingApplications = async (userId) => {
  const since = new Date(Date.now() - PENDING_EXPIRY_MS);

  const pending = await JobApplication.find({
    userId,
    status: "Pending",
    clickedAt: { $gte: since },
  })
    .sort({ clickedAt: -1 })
    .limit(5)
    .populate("jobId", "title company companyLogo location")
    .lean();

  return pending
    .filter((p) => p.jobId)
    .map((p) => ({
      jobId: p.jobId._id,
      title: p.jobId.title,
      company: p.jobId.company,
      companyLogo: p.jobId.companyLogo,
      location: p.jobId.location,
      clickedAt: p.clickedAt,
    }));
};

// Step 3: user answered "Did you apply?"
export const confirmApply = async (jobId, userId, applied) => {
  const application = await JobApplication.findOne({
    userId,
    jobId,
    status: "Pending",
  });

  if (!application) return null;

  if (!applied) {
    await application.deleteOne();
    return { jobId, applied: false };
  }

  application.status = "Applied";
  application.appliedAt = new Date();
  await application.save();

  await Job.updateOne({ _id: jobId }, { $inc: { applicationsCount: 1 } });

  return {
    applicationId: application._id,
    jobId,
    applied: true,
    status: application.status,
    appliedAt: application.appliedAt,
  };
};