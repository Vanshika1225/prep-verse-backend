import { AUTH_MESSAGES } from "../../constants/messages.js";
import { comparePassword, hashedPassword } from "../../utils/bcrypt.js";
import { sendEmail } from "../../utils/email.js";
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt.js";
import { generateResetToken, hashToken } from "../../utils/token.js";
import { UserProfile } from "../users/users.model.js";
import User from "./auth.model.js";

export const signupService = async (name, email, password) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error(AUTH_MESSAGES.USER_EXISTS);
  }

  const hashPassword = await hashedPassword(password);
  const user = await User.create({ name, email, password: hashPassword });
  await UserProfile.create({
    userId: user._id,
    name: user.name,
  });
  return user;
};

export const loginService = async (email, password, rememberMe) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new Error(AUTH_MESSAGES.EMAIL_NOT_REGISTERED);
  }
  const isPasswordSame = await comparePassword(password, user.password);
  if (!isPasswordSame) {
    throw new Error(AUTH_MESSAGES.WRONG_PASSWORD_ENTERED);
  }
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user, rememberMe);
  return { user, accessToken, refreshToken };
};

export const forgetPasswordService = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error(AUTH_MESSAGES.EMAIL_NOT_REGISTERED);
  }
  const resetToken = generateResetToken();
  const hashedToken = hashToken(resetToken);
  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;

  const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  await sendEmail(
    user.email,
    "Reset your PrepVerse password",
    `
    <!DOCTYPE html>
    <html>
    <head>
    <meta charset="UTF-8">
    <title>Reset Password</title>
    </head>
    <body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;">

    <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr>
    <td align="center">

    <table width="600" cellpadding="0" cellspacing="0"
    style="
    background:#ffffff;
    border-radius:16px;
    padding:40px;
    box-shadow:0 8px 30px rgba(0,0,0,0.08);
    ">

    <tr>
    <td align="center">

    <h1 style="
    margin:0;
    color:#5B3DF5;
    font-size:30px;
    ">
    🔐 PrepVerse
    </h1>

    </td>
    </tr>

    <tr>
    <td style="padding-top:30px;">

    <h2 style="
    margin:0 0 16px;
    font-size:26px;
    color:#1f2937;
    ">
    Reset your password
    </h2>

    <p style="
    font-size:16px;
    line-height:28px;
    color:#6b7280;
    margin-bottom:24px;
    ">
    Hi <strong>${user.name}</strong>,
    </p>

    <p style="
    font-size:16px;
    line-height:28px;
    color:#6b7280;
    ">
    We received a request to reset the password for your
    <strong>PrepVerse</strong> account.
    </p>

    <p style="
    font-size:16px;
    line-height:28px;
    color:#6b7280;
    ">
    Click the button below to create a new password.
    This password reset link is valid for
    <strong>15 minutes</strong>.
    </p>

    </td>
    </tr>

    <tr>
    <td align="center" style="padding:35px 0;">

    <a
    href="${resetLink}"
    style="
    display:inline-block;
    background:#5B3DF5;
    color:white;
    padding:16px 40px;
    text-decoration:none;
    font-size:16px;
    font-weight:600;
    border-radius:10px;
    ">
    Reset Password
    </a>

    </td>
    </tr>

    <tr>
    <td>

    <div
    style="
    background:#F4F1FF;
    border-left:4px solid #5B3DF5;
    padding:18px;
    border-radius:8px;
    margin-bottom:20px;
    "
    >

    <p style="margin:0;color:#374151;font-size:15px;">
    If the button doesn't work, copy and paste this link into your browser:
    </p>

    <p style="
    margin-top:10px;
    word-break:break-all;
    font-size:14px;
    color:#5B3DF5;
    ">
    ${resetLink}
    </p>

    </div>

    </td>
    </tr>

    <tr>
    <td>

    <p style="
    font-size:15px;
    line-height:26px;
    color:#6b7280;
    ">
    If you didn't request a password reset, you can safely ignore this email.
    Your password will remain unchanged.
    </p>

    </td>
    </tr>

    <tr>
    <td>

    <hr style="
    border:none;
    border-top:1px solid #eeeeee;
    margin:30px 0;
    ">

    <p style="
    font-size:14px;
    color:#9ca3af;
    text-align:center;
    line-height:24px;
    ">

    Thanks,<br>
    <strong>PrepVerse Team</strong>

    </p>

    </td>
    </tr>

    </table>

    </td>
    </tr>
    </table>

    </body>
    </html>
    `,
  );
  await user.save();
};

export const resetPasswordService = async (token, password) => {
  const hashedToken = hashToken(token);
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: {
      $gt: Date.now(),
    },
  });

  if (!user) {
    throw new Error(AUTH_MESSAGES.INVALID_TOKEN);
  }

  const hashPassword = await hashedPassword(password);
  user.password = hashPassword;
  user.resetPasswordExpires = undefined;
  user.resetPasswordToken = undefined;

  await user.save();
};

export const logoutService = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error(AUTH_MESSAGES.USER_NOT_FOUND);
  }

  user.refreshToken = null;
  user.accessToken = null;
  await user.save();
};

export const googleLoginService = async (payload) => {
  const { sub, email, name, picture, email_verified } = payload;

  if (!email_verified) {
    throw new Error("Google account is not verified.");
  }

  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      name,
      email,
      googleId: sub,
      avatar: picture,
      provider: "google",
    });

    await UserProfile.create({
      userId: user._id,
      name: user.name,
    });
  }

  if (!user.googleId) {
    user.googleId = sub;
  }

  if (!user.avatar) {
    user.avatar = picture;
  }

  await user.save();

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user, false);

  return {
    user,
    accessToken,
    refreshToken,
  };
};
