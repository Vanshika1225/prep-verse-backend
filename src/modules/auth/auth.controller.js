import { AUTH_MESSAGES } from "../../constants/messages.js";
import { httpStatusCodes } from "../../constants/statusCode.js";
import { signupService } from "./auth.service.js";

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