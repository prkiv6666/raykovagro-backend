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

app.get("/send-email", (req, res) => {
  res.status(200).send("Use POST for /send-email")
})

app.post("/send-email", async (req, res) => {
  console.log("POST /send-email called")

  try {
    console.log("BODY:", JSON.stringify(req.body, null, 2))
    console.log("EMAIL_USER exists:", !!process.env.EMAIL_USER)
    console.log("EMAIL_PASS exists:", !!process.env.EMAIL_PASS)
    console.log("EMAIL_TO exists:", !!process.env.EMAIL_TO)

    const { name, email, message } = req.body || {}

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        error: "Missing fields",
      })
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
      family: 4,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    })

    console.log("Transporter created")
    console.log("Sending email...")

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
    console.error("SEND EMAIL ERROR FULL:", error)
    console.error("ERROR MESSAGE:", error?.message)
    console.error("ERROR CODE:", error?.code)
    console.error("ERROR COMMAND:", error?.command)
    console.error("ERROR RESPONSE:", error?.response)

    return res.status(500).json({
      success: false,
      error: error?.message || "Server error",
      code: error?.code || null,
    })
  }
})

const PORT = process.env.PORT || 8080

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})