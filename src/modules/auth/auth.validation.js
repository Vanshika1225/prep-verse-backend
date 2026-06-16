import { z } from 'zod'
export const SignupSchema = z.object({
    name: z.string().min(3, "Name must be atleast 3 Characters."),
    email: z.email("Invalid email."),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/,
            "Password must contain uppercase, lowercase, number and special character"
        )
})

export const loginSchema = z.object({
    email: z.string().email("Invalid email."),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/,
            "Password must contain uppercase, lowercase, number and special character"
        )
})