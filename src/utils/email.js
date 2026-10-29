import dotenv from "dotenv";
dotenv.config();

import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
    service: 'gmail',
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
})

export const sendEmail = async (to, subject, html) => {
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject,
        html
    })
}