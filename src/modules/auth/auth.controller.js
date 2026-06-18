import { AUTH_MESSAGES } from "../../constants/messages.js";
import { httpStatusCodes } from "../../constants/statusCode.js";
import { forgetPasswordService, loginService, logoutService, resetPasswordService, signupService } from "./auth.service.js";
import { loginSchema } from "./auth.validation.js";

export const signup = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        const user = await signupService(name, email, password);
        res.status(httpStatusCodes.CREATED).json({
            success: true,
            message: AUTH_MESSAGES.USER_CREATED,
            data: user
        })
    } catch (error) {
        res.status(httpStatusCodes.BAD_REQUEST).json({
            success: false,
            message: error.message
        });
    }
}

export const login = async (req, res) => {
    try {
        const data = loginSchema.parse(req.body);
        const result = await loginService(data.email, data.password, data.rememberMe);
        return res.status(httpStatusCodes.OK).json({
            success: true,
            message: AUTH_MESSAGES.LOGIN_SUCCESS,
            data: result
        })
    } catch (err) {
        return res.status(httpStatusCodes.BAD_REQUEST).json({
            success: false,
            message: err.message
        })
    }
}

export const forgotPasswprd = async (req, res) => {
    try {
        const { email } = req.body;
        const result = await forgetPasswordService(email);
        return res.status(httpStatusCodes.OK).json({
            success: true,
            message: AUTH_MESSAGES.RESENT_LINK_SENT
        })
    } catch (err) {
        return res.status(httpStatusCodes.BAD_REQUEST).json({
            success: false,
            message: err.message
        })
    }
}

export const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;
        const result = await resetPasswordService(token, password);
        return res.status(httpStatusCodes.OK).json({
            success: true,
            message: AUTH_MESSAGES.PASSWORD_RESET_SUCCESSFULLY
        })
    } catch (err) {
        return res.status(httpStatusCodes.BAD_REQUEST).json({
            success: false,
            message: err.message
        })
    }
}

export const logout = async (req, res) => {
    try {
        const { userId } = req.body;
        const result = await logoutService(userId);
        return res.status(httpStatusCodes.OK).json({
            success: true,
            message: AUTH_MESSAGES.LOGOUT_SUCCESS
        })
    } catch (err) {
        return res.status(httpStatusCodes.BAD_REQUEST).json({
            success: false,
            message: err.message
        })
    }
}