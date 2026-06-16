import express from 'express'
import { signup, login } from './auth.controller.js'
import validate from '../../middleware/validation.middleware.js';
import { loginSchema, SignupSchema } from './auth.validation.js';

const router = express.Router()

router.post('/signup', validate(SignupSchema), signup)
router.post('/login', validate(loginSchema), login)

export default router
