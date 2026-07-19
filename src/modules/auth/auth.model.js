import mongoose from "mongoose";
import { ROLES } from "../../constants/roles.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: "string",
      required: true,
      trim: true,
    },
    email: {
      type: "string",
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: function () {
        return this.provider === "local";
      },
    },
    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    role: {
      type: "string",
      enum: [ROLES.USER, ROLES.ADMIN],
      default: ROLES.USER,
    },
    resetPasswordToken: {
      type: "string",
    },
    resetPasswordExpires: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", userSchema);

export default User;
