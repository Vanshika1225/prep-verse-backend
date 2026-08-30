import logger from "../../utils/logger.js";
import { AUTH_MESSAGES } from "../../constants/messages.js";
import { httpStatusCodes } from "../../constants/statusCode.js";
import {
  forgetPasswordService,
  googleLoginService,
  loginService,
  logoutService,
  refreshAccessTokenService,
  resetPasswordService,
  signupService,
} from "./auth.service.js";
import { loginSchema } from "./auth.validation.js";
import { OAuth2Client } from "google-auth-library";

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api/auth",
};

export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    logger.info(`Signup attempt: ${email}`);
    const user = await signupService(name, email, password);
    logger.info(`User registered successfully: ${email}`);
    return res.status(httpStatusCodes.CREATED).json({
      success: true,
      message: AUTH_MESSAGES.USER_CREATED,
      data: user,
    });
  } catch (error) {
    logger.warn(`Signup failed for ${req.body.email}: ${error.message}`);

    return res.status(httpStatusCodes.BAD_REQUEST).json({
      success: false,
      message: error.message,
    });
  }
};

export const refreshAccessToken = async (req, res) => {
  try {
    const { accessToken, refreshToken } = await refreshAccessTokenService(
      req.cookies?.refreshToken,
    );
    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);
    return res.status(httpStatusCodes.OK).json({
      success: true,
      message: "Token refreshed",
      data: { accessToken },
    });
  } catch (err) {
    res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);
    return res.status(401).json({ success: false, message: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);
    logger.info(`Login attempt: ${data.email}`);
    const result = await loginService(
      data.email,
      data.password,
      data.rememberMe,
    );
    res.cookie("refreshToken", result.refreshToken, {
      ...REFRESH_COOKIE_OPTIONS,
      maxAge: data.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000,
    });

    logger.info(`Login successful: ${data.email}`);
    return res.status(httpStatusCodes.OK).json({
      success: true,
      message: AUTH_MESSAGES.LOGIN_SUCCESS,
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (err) {
    logger.warn(`Login failed for ${req.body.email}: ${err.message}`);
    return res.status(httpStatusCodes.BAD_REQUEST).json({
      success: false,
      message: err.message,
    });
  }
};

export const forgotPasswprd = async (req, res) => {
  try {
    const { email } = req.body;
    logger.info(`Password reset requested: ${email}`);
    await forgetPasswordService(email);
    logger.info(`Password reset email sent: ${email}`);
    return res.status(httpStatusCodes.OK).json({
      success: true,
      message: AUTH_MESSAGES.RESENT_LINK_SENT,
    });
  } catch (err) {
    logger.warn(`Forgot password failed for ${req.body.email}: ${err.message}`);
    return res.status(httpStatusCodes.BAD_REQUEST).json({
      success: false,
      message: err.message,
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    await resetPasswordService(token, password);
    logger.info("Password reset completed successfully.");
    return res.status(httpStatusCodes.OK).json({
      success: true,
      message: AUTH_MESSAGES.PASSWORD_RESET_SUCCESSFULLY,
    });
  } catch (err) {
    logger.warn(`Password reset failed: ${err.message}`);
    return res.status(httpStatusCodes.BAD_REQUEST).json({
      success: false,
      message: err.message,
    });
  }
};
export const logout = async (req, res) => {
  try {
    await logoutService(req.user.userId); // from verifyAccessToken middleware
    res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);
    return res
      .status(httpStatusCodes.OK)
      .json({ success: true, message: AUTH_MESSAGES.LOGOUT_SUCCESS });
  } catch (err) {
    logger.warn(`Logout failed: ${err.message}`);
    return res
      .status(httpStatusCodes.BAD_REQUEST)
      .json({ success: false, message: err.message });
  }
};

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleLogin = async (req, res) => {
  try {
    const { token } = req.body;

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const result = await googleLoginService(payload);

    res.cookie("refreshToken", result.refreshToken, {
      ...REFRESH_COOKIE_OPTIONS,

      maxAge: 24 * 60 * 60 * 1000,
    });

    logger.info(`Google login successful: ${payload.email}`);

    return res.status(httpStatusCodes.OK).json({
      success: true,
      message: AUTH_MESSAGES.LOGIN_SUCCESS,
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (err) {
    logger.error(`Google login failed: ${err.message}`);

    return res.status(httpStatusCodes.BAD_REQUEST).json({
      success: false,
      message: err.message,
    });
  }
};
