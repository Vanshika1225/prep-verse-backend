import logger from "../../utils/logger.js";
import { Job } from "./jobOpenings.model.js";

const SKILL_DICTIONARY = [
  "JavaScript",
  "TypeScript",
  "React",
  "React Native",
  "Next.js",
  "Angular",
  "Vue",
  "Node.js",
  "Express",
  "NestJS",
  "MongoDB",
  "MySQL",
  "PostgreSQL",
  "Redis",
  "GraphQL",
  "REST",
  "HTML",
  "CSS",
  "Tailwind",
  "Redux",
  "Python",
  "Django",
  "Flask",
  "FastAPI",
  "Java",
  "Spring Boot",
  "Kotlin",
  "Swift",
  "C++",
  "C#",
  ".NET",
  "PHP",
  "Laravel",
  "Golang",
  "Rust",
  "Ruby",
  "Rails",
  "AWS",
  "Azure",
  "GCP",
  "Docker",
  "Kubernetes",
  "Terraform",
  "Jenkins",
  "CI/CD",
  "Git",
  "Linux",
  "SQL",
  "Kafka",
  "System Design",
  "Data Structures",
  "Algorithms",
  "Machine Learning",
  "Android",
  "iOS",
  "Flutter",
  "Selenium",
  "Microservices",
];

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const SKILL_MATCHERS = SKILL_DICTIONARY.map((name) => ({
  name,
  regex: new RegExp(`(?<![A-Za-z0-9])${escapeRegex(name)}(?![A-Za-z0-9])`, "i"),
}));

const JOB_TYPE_MAP = {
  FULLTIME: "Full Time",
  PARTTIME: "Part Time",
  INTERN: "Internship",
  INTERNSHIP: "Internship",
  CONTRACTOR: "Contract",
  CONTRACT: "Contract",
};

let isRunning = false;

const SOURCE = "jsearch";
const JSEARCH_URL =
  process.env.JSEARCH_URL || "https://jsearch.p.rapidapi.com/search-v2";
const JSEARCH_HOST = process.env.JSEARCH_HOST || "jsearch.p.rapidapi.com";
const STALE_AFTER_MS = 14 * 24 * 60 * 60 * 1000;

async function fetchJSearch({ query, datePosted, cursor }) {
  const params = new URLSearchParams({
    query,
    num_pages: "1",
    country: "in",
    date_posted: datePosted,
  });
  if (cursor) params.set("cursor", cursor);

  const response = await fetch(`${JSEARCH_URL}?${params}`, {
    headers: {
      "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
      "X-RapidAPI-Host": JSEARCH_HOST,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const error = new Error(
      `JSearch request failed (${response.status}) ${body.slice(0, 300)}`,
    );
    error.status = response.status;
    throw error;
  }

  const json = await response.json();
  const jobs = Array.isArray(json.data?.jobs)
    ? json.data.jobs
    : Array.isArray(json.data)
      ? json.data
      : [];

  return { jobs, cursor: json.data?.cursor || null };
}

function extractSkills(raw) {
  const text = `${raw.job_title || ""} ${raw.job_description || ""}`;
  const fromApi = Array.isArray(raw.job_required_skills)
    ? raw.job_required_skills
    : [];
  const fromText = SKILL_MATCHERS.filter(({ regex }) => regex.test(text)).map(
    ({ name }) => name,
  );

  const seen = new Map();
  [...fromApi, ...fromText].forEach((skill) => {
    const key = String(skill).trim().toLowerCase();
    if (key && !seen.has(key)) seen.set(key, String(skill).trim());
  });

  return [...seen.values()].slice(0, 12);
}

function mapSalary(raw) {
  const min = Number(raw.job_min_salary);
  const max = Number(raw.job_max_salary);
  const currency = String(raw.job_salary_currency || "").toUpperCase();
  const period = String(raw.job_salary_period || "").toUpperCase();

  if (currency !== "INR" || !(min > 0 || max > 0)) {
    return { salaryMin: null, salaryMax: null };
  }

  const multiplier = period === "MONTH" ? 12 : period === "YEAR" ? 1 : null;
  if (!multiplier) return { salaryMin: null, salaryMax: null };

  const toLpa = (value) =>
    value > 0 ? Math.round(((value * multiplier) / 100000) * 10) / 10 : null;

  const salaryMin = toLpa(min) ?? toLpa(max);
  const salaryMax = toLpa(max) ?? toLpa(min);

  return { salaryMin, salaryMax };
}

function mapExperience(raw) {
  const exp = raw.job_required_experience || {};
  if (exp.no_experience_required) return 0;

  const months = Number(exp.required_experience_in_months);
  if (Number.isFinite(months) && months > 0) return Math.floor(months / 12);

  const text = raw.job_description || "";

  const match = text.match(
    /(\d{1,2})\s*(?:\+|[-–]\s*\d{1,2}|\s+to\s+\d{1,2})?\s*\+?\s*(?:years?|yrs?)\b/i,
  );
  if (match) {
    const years = Number(match[1]);
    if (years >= 0 && years <= 25) return years;
  }

  if (/\b(fresher|entry[- ]level|graduate trainee)\b/i.test(text)) return 0;

  return null;
}

function mapWorkMode(raw) {
  if (raw.job_is_remote) return "Remote";

  const text = `${raw.job_title || ""} ${(raw.job_description || "").slice(0, 2000)}`;
  if (/hybrid/i.test(text)) return "Hybrid";

  return "On-site";
}

function mapJobType(raw) {
  const value = raw.job_employment_type || raw.job_employment_types?.[0] || "";
  const key = String(value)
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  return JOB_TYPE_MAP[key] || "Full Time";
}

function mapJob(raw) {
  if (
    !raw?.job_id ||
    !raw.job_title ||
    !raw.employer_name ||
    !raw.job_apply_link
  ) {
    return null;
  }

  const city = raw.job_city || "";
  const location =
    [raw.job_city, raw.job_state].filter(Boolean).join(", ") ||
    raw.job_location ||
    "India";

  const postedAt = raw.job_posted_at_datetime_utc
    ? new Date(raw.job_posted_at_datetime_utc)
    : new Date();

  const expiresAt = raw.job_offer_expiration_datetime_utc
    ? new Date(raw.job_offer_expiration_datetime_utc)
    : null;

  return {
    source: SOURCE,
    externalId: String(raw.job_id),
    publisher: raw.job_publisher || "",
    title: raw.job_title.trim(),
    company: raw.employer_name.trim(),
    companyLogo: raw.employer_logo || "",
    location,
    city,
    workMode: mapWorkMode(raw),
    jobType: mapJobType(raw),
    experienceMin: mapExperience(raw),
    ...mapSalary(raw),
    currency: "INR",
    description: (raw.job_description || "").slice(0, 6000),
    requirements: (raw.job_highlights?.Qualifications || []).slice(0, 10),
    skills: extractSkills(raw),
    applyUrl: raw.job_apply_link,
    postedAt: Number.isNaN(postedAt.getTime()) ? new Date() : postedAt,
    expiresAt:
      expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null,
    lastSyncedAt: new Date(),
    isActive: true,
  };
}

async function upsertJobs(mappedJobs) {
  if (!mappedJobs.length) return 0;

  const operations = mappedJobs.map((job) => ({
    updateOne: {
      filter: { source: job.source, externalId: job.externalId },
      update: { $set: job },
      upsert: true,
    },
  }));

  const result = await Job.bulkWrite(operations, { ordered: false });
  return result.upsertedCount + result.modifiedCount;
}

async function deactivateStaleJobs() {
  const now = new Date();
  const staleBefore = new Date(Date.now() - STALE_AFTER_MS);

  const result = await Job.updateMany(
    {
      source: SOURCE,
      isActive: true,
      $or: [
        { expiresAt: { $lt: now } },
        { lastSyncedAt: { $lt: staleBefore } },
      ],
    },
    { $set: { isActive: false } },
  );

  return result.modifiedCount;
}

export const runJobSync = async () => {
  if (isRunning) return { skipped: true, reason: "Sync already running." };

  if (!process.env.RAPIDAPI_KEY) {
    logger.warn("Job sync skipped: RAPIDAPI_KEY is not set.");
    return { skipped: true, reason: "RAPIDAPI_KEY missing." };
  }

  isRunning = true;

  const queries = (
    process.env.JOBS_SYNC_QUERIES || "software developer in India"
  )
    .split("|")
    .map((q) => q.trim())
    .filter(Boolean);
  const pages = Math.max(parseInt(process.env.JOBS_SYNC_PAGES, 10) || 1, 1);
  const datePosted = process.env.JOBS_SYNC_DATE_POSTED || "week";

  const stats = { fetched: 0, saved: 0, failedRequests: 0, deactivated: 0 };

  try {
    outer: for (const query of queries) {
      let cursor = null;

      for (let page = 1; page <= pages; page++) {
        try {
          const { jobs: rawJobs, cursor: nextCursor } = await fetchJSearch({
            query,
            datePosted,
            cursor,
          });
          stats.fetched += rawJobs.length;

          const unique = new Map();
          rawJobs.forEach((raw) => {
            const mapped = mapJob(raw);
            if (mapped) unique.set(mapped.externalId, mapped);
          });

          stats.saved += await upsertJobs([...unique.values()]);

          cursor = nextCursor;
          if (rawJobs.length === 0 || !cursor) break;
        } catch (err) {
          stats.failedRequests += 1;
          logger.error(`Job sync failed for "${query}" page ${page}:`, err);

          if (err.status === 429 || err.status === 403) break outer;
          break;
        }
      }
    }

    stats.deactivated = await deactivateStaleJobs();
    logger.info(`Job sync finished: ${JSON.stringify(stats)}`);

    return stats;
  } finally {
    isRunning = false;
  }
};
