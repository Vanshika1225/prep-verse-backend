import { httpStatusCodes } from "../constants/statusCode.js";

const validate = (schema) => {
    return (req, res, next) => {
        const result = schema.safeParse(req.body)
        if (!result.success) {
            return res.status(httpStatusCodes.BAD_REQUEST).json({
                success: false,
                message: result.error.issues[0].message
            })
        }

        req.body = result.data;
        next()
    }
}

export default validate