import cookieParser from 'cookie-parser';
import express from 'express'
import cors from 'cors'
import authRoutes from './modules/auth/auth.route.js';
import errorHandler from './middleware/error.middleware.js';
import validate from './middleware/validation.middleware.js';
import { SignupSchema } from './modules/auth/auth.validation.js';

const app = express();

app.use(express.json())
app.use(cookieParser())
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}))

app.use('/api/auth',validate(SignupSchema), authRoutes)

app.use(errorHandler)

export default app