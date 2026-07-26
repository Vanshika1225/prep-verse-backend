import mongoose from "mongoose";

const problemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      required: true,
    },
    topics: [{ type: String }],
    problemLink: { type: String, required: true },
  },
  { timestamps: true },
);

const userProblemSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      required: true,
    },

    status: {
      type: String,
      enum: ["Not Started", "Attempted", "Solved", "Review"],
      default: "Not Started",
    },

    bookmarked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

userProblemSchema.index(
  {
    userId: 1,
    problemId: 1,
  },
  {
    unique: true,
  },
);

const UserProblem = mongoose.model("UserProblem", userProblemSchema);
const AllProblems = mongoose.model("Problem", problemSchema);
export { AllProblems, UserProblem };
