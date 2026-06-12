import { AUTH_MESSAGES } from "../../constants/messages.js"
import { hashedPassword } from "../../utils/bcrypt.js"
import User from "./auth.model.js"

export const signupService = async (name, email, password) => {
    const existingUser = await User.findOne({ email })
    if (existingUser) {
        throw new Error(AUTH_MESSAGES.USER_EXISTS)
    }

    const hashPassword = await hashedPassword(password);
    const user = await User.create({ name, email, password: hashPassword });

    return user;
}