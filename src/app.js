import cookieParser from "cookie-parser";
import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.route.js";
import problemRoutes from "./modules/dsa/allProblems/allProblems.route.js";
import patternRoutes from "./modules/dsa/patternwise/patternwise.route.js";
import randomProblemRoutes from "./modules/dsa/randomProblems/randomProblems.route.js";
import studyPlannerRoute from "./modules/studyPlanner/studyPlanner.route.js";
import roadmapRoute from "./modules/roadmap/roadmap.route.js";
import contestsRoutes from "./modules/dsa/contests/contests.route.js";
import userRoutes from "./modules/users/users.route.js";
import errorHandler from "./middleware/error.middleware.js";
import morgan from "morgan";
import logger from "./utils/logger.js";

const allowedOrigins = [
  "http://localhost:5173",
  "https://prep-verse-frontend-git-dev-vanshikas-projects-21dfd3b4.vercel.app",
  "https://prep-verse-frontend-4okl69xuo-vanshikas-projects-21dfd3b4.vercel.app",
];

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

app.use(
  morgan("dev", {
    stream: {
      write: (message) => logger.http(message.trim()),
    },
  }),
);

app.use(errorHandler);

// authentication
app.use("/api/auth", authRoutes);

// dsa
app.use("/api/problems/randomProblem", randomProblemRoutes);
app.use("/api/problems/patternwise", patternRoutes);
app.use("/api/problems", problemRoutes);

app.use("/api/contests", contestsRoutes);

// Study Planner
app.use("/api/study-planner", studyPlannerRoute);

// Roadmap
app.use("/api/roadmap", roadmapRoute);

// users
app.use("/api/users", userRoutes);

export default app;
