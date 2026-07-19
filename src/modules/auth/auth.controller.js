import logger from "../../utils/logger.js";
import { AUTH_MESSAGES } from "../../constants/messages.js";
import { httpStatusCodes } from "../../constants/statusCode.js";
import {
    forgetPasswordService,
    googleLoginService,
    loginService,
    logoutService,
    resetPasswordService,
    signupService
} from "./auth.service.js";
import { loginSchema } from "./auth.validation.js";
import { OAuth2Client } from "google-auth-library";

export const signup = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        logger.info(`Signup attempt: ${email}`);
        const user = await signupService(name, email, password);
        logger.info(`User registered successfully: ${email}`);
        return res.status(httpStatusCodes.CREATED).json({
            success: true,
            message: AUTH_MESSAGES.USER_CREATED,
            data: user
        })
    } catch (error) {
        res.status(httpStatusCodes.BAD_REQUEST).json({
            success: false,
            message: error.message
        });
        logger.warn(`Signup failed for ${req.body.email}: ${error.message}`);
    }
}

export const login = async (req, res) => {
    try {
        const data = loginSchema.parse(req.body);
        logger.info(`Login attempt: ${data.email}`);
        const result = await loginService(
            data.email,
            data.password,
            data.rememberMe
        );
        logger.info(`Login successful: ${data.email}`);
        return res.status(httpStatusCodes.OK).json({
            success: true,
            message: AUTH_MESSAGES.LOGIN_SUCCESS,
            data: result
        });
    } catch (err) {
        return res.status(httpStatusCodes.BAD_REQUEST).json({
            success: false,
            message: err.message
        })
        logger.warn(`Login failed for ${req.body.email}: ${err.message}`);
    }
}

export const forgotPasswprd = async (req, res) => {
    try {
        const { email } = req.body;
        logger.info(`Password reset requested: ${email}`);
        await forgetPasswordService(email);
        logger.info(`Password reset email sent: ${email}`);
        return res.status(httpStatusCodes.OK).json({
            success: true,
            message: AUTH_MESSAGES.RESENT_LINK_SENT
        });
    } catch (err) {
        return res.status(httpStatusCodes.BAD_REQUEST).json({
            success: false,
            message: err.message
        })
        logger.warn(`Forgot password failed for ${req.body.email}: ${err.message}`);
        next(err);
    }
};

export const resetPassword = async (req, res, next) => {
    try {
        const { token, password } = req.body;
        await resetPasswordService(token, password);
        logger.info("Password reset completed successfully.");
        return res.status(httpStatusCodes.OK).json({
            success: true,
            message: AUTH_MESSAGES.PASSWORD_RESET_SUCCESSFULLY
        });
    } catch (err) {
        return res.status(httpStatusCodes.BAD_REQUEST).json({
            success: false,
            message: err.message
        })
        logger.warn(`Password reset failed: ${err.message}`);
        next(err);
    }
}

export const logout = async (req, res, next) => {
    try {
        const { userId } = req.body;
        await logoutService(userId);
        logger.info(`User logged out: ${userId}`);
        return res.status(httpStatusCodes.OK).json({
            success: true,
            message: AUTH_MESSAGES.LOGOUT_SUCCESS
        });
    } catch (err) {
        return res.status(httpStatusCodes.BAD_REQUEST).json({
            success: false,
            message: err.message
        })
        logger.warn(`Logout failed for user ${req.body.userId}: ${err.message}`);
        next(err);
    }
}

const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID
);

export const googleLogin = async (req, res) => {
    try {
        const { token } = req.body;

        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();

        const result = await googleLoginService(payload);

        logger.info(`Google login successful: ${payload.email}`);

        return res.status(httpStatusCodes.OK).json({
            success: true,
            message: AUTH_MESSAGES.LOGIN_SUCCESS,
            data: result,
        });

    } catch (err) {
        logger.error(`Google login failed: ${err.message}`);

        return res.status(httpStatusCodes.BAD_REQUEST).json({
            success: false,
            message: err.message,
        });
    }
};