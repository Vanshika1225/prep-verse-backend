import { AUTH_MESSAGES } from "../../constants/messages.js"
import { comparePassword, hashedPassword } from "../../utils/bcrypt.js"
import { generateAccessToken } from "../../utils/jwt.js"
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

export const loginService = async (email, password) => {
    const user = await User.findOne({ email });
    if (!user) {
        throw new Error(AUTH_MESSAGES.EMAIL_NOT_REGISTERED)
    }
    const isPasswordSame = await comparePassword(password, user.password)
    if (!isPasswordSame) {
        throw new Error(AUTH_MESSAGES.WRONG_PASSWORD_ENTERED)
    }
    const accessToken = generateAccessToken(user);
    return { user, accessToken }
}