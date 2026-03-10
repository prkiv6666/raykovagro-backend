import express from "express"
import cors from "cors"
import nodemailer from "nodemailer"
import dotenv from "dotenv"

dotenv.config()

const app = express()

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
)

app.use(express.json())

app.get("/", (req, res) => {
  res.status(200).send("Backend is running")
})

app.post("/send-email", async (req, res) => {
  try {
    console.log("POST /send-email hit")
    console.log("Request body:", req.body)
    console.log("EMAIL_USER exists:", !!process.env.EMAIL_USER)
    console.log("EMAIL_PASS exists:", !!process.env.EMAIL_PASS)
    console.log("EMAIL_TO exists:", !!process.env.EMAIL_TO)

    const { name, email, message } = req.body

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        error: "Missing fields",
      })
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(500).json({
        success: false,
        error: "Email credentials are missing in environment variables",
      })
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })

    console.log("Transporter created")

    await transporter.verify()
    console.log("Transporter verified")

    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO || process.env.EMAIL_USER,
      subject: `Message from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
      replyTo: email,
    })

    console.log("Email sent successfully:", info.response)

    return res.status(200).json({
      success: true,
      message: "Email sent successfully",
    })
  } catch (error) {
    console.error("SEND EMAIL ERROR:", error)

    return res.status(500).json({
      success: false,
      error: "Server error",
      details: error.message,
    })
  }
})

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})