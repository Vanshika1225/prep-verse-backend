import express from "express";
import {
  signup,
  login,
  forgotPasswprd,
  resetPassword,
  logout,
  googleLogin,
} from "./auth.controller.js";
import validate from "../../middleware/validation.middleware.js";
import {
  forgetPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  SignupSchema,
} from "./auth.validation.js";

const router = express.Router();

router.post("/signup", validate(SignupSchema), signup);
router.post("/login", validate(loginSchema), login);
router.post("/forgot-password", validate(forgetPasswordSchema), forgotPasswprd);
router.post("/reset-Password", validate(resetPasswordSchema), resetPassword);
router.post("/logout", logout);
router.post("/google", googleLogin);

export default router;
