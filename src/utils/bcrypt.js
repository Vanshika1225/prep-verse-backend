import bcrypt from "bcryptjs"

export const hashedPassword = async (password) => {
    return await bcrypt.hash(password, 10)
}

export const comparePassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword)
}