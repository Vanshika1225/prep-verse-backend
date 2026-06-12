import mongoose from "mongoose";
import { ROLES } from "../../constants/roles.js";

const userSchema = new mongoose.Schema({
    name: {
        type: "string",
        required: true,
        trim: true
    },
    email: {
        type: "string",
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: "string",
        required: true,
    },
    role: {
        type: "string",
        enum: [ROLES.USER, ROLES.ADMIN],
        default: ROLES.USER
    }
}, {
    timestamps: true
})

const User = mongoose.model("User", userSchema)

export default User