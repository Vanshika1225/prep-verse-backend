import { AUTH_MESSAGES } from "../../constants/messages.js"
import { comparePassword, hashedPassword } from "../../utils/bcrypt.js"
import { sendEmail } from "../../utils/email.js"
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt.js"
import { generateResetToken, hashToken } from "../../utils/token.js"
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

export const loginService = async (email, password, rememberMe) => {
    const user = await User.findOne({ email });
    if (!user) {
        throw new Error(AUTH_MESSAGES.EMAIL_NOT_REGISTERED)
    }
    const isPasswordSame = await comparePassword(password, user.password)
    if (!isPasswordSame) {
        throw new Error(AUTH_MESSAGES.WRONG_PASSWORD_ENTERED)
    }
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user, rememberMe)
    return { user, accessToken, refreshToken }
}

export const forgetPasswordService = async (email) => {
    const user = await User.findOne({ email });
    if (!user) {
        throw new Error(AUTH_MESSAGES.EMAIL_NOT_REGISTERED)
    }
    const resetToken = generateResetToken();
    const hashedToken = hashToken(resetToken);
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`

    await sendEmail(
        user.email,
        "Reset Password",
        `
        <h2>Reset Password</h2>

        <p>
          Click below to reset password
        </p>

        <a href="${resetLink}">
            Reset Password
        </a>
        `
    )
    await user.save();
}

export const resetPasswordService = async (token, password) => {
    const hashedToken = hashToken(token);
    const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: {
            $gt: Date.now()
        }
    })

    if (!user) {
        throw new Error(AUTH_MESSAGES.INVALID_TOKEN)
    }

    const hashPassword = await hashedPassword(password)
    user.password = hashPassword
    user.resetPasswordExpires = undefined
    user.resetPasswordToken = undefined

    await user.save()
}