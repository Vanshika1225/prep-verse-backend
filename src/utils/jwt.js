import jwt from "jsonwebtoken"

export const generateAccessToken = (user) => {
    return jwt.sign(
        {
            userId: user._id,
            role: user.role
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: '15m'
        }
    )
}

export const generateRefreshToken = (user, rememberMe = false) => {
    return jwt.sign(
        {
            userId: user._id,
            role: user.role
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: rememberMe ? "30d" : '24h'
        }
    )
}