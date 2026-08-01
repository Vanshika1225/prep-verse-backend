import cookieParser from "cookie-parser";
import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.route.js";
import problemRoutes from "./modules/dsa/allProblems/allProblems.route.js";
import patternRoutes from "./modules/dsa/patternwise/patternwise.route.js";
import randomProblemRoutes from "./modules/dsa/randomProblems/randomProblems.route.js";
import contestsRoutes from "./modules/dsa/contests/contests.route.js";
import errorHandler from "./middleware/error.middleware.js";
import validate from "./middleware/validation.middleware.js";
import { SignupSchema } from "./modules/auth/auth.validation.js";
import morgan from "morgan";
import logger from "./utils/logger.js";

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173",
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
app.use("/api/problems", problemRoutes);
app.use("/api/problems/patternwise", patternRoutes);
app.use("/api/problems/randomProblem", randomProblemRoutes);
app.use("/api/contests", contestsRoutes);

export default app;
