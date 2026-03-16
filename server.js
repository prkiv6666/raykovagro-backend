import express from "express"
import cors from "cors"
import helmet from "helmet"
import rateLimit from "express-rate-limit"
import nodemailer from "nodemailer"
import dotenv from "dotenv"

dotenv.config()

const app = express()

const normalizeOrigin = (origin) => origin.trim().replace(/\/$/, "").toLowerCase()

const defaultOrigins = ["https://raykovagro.bg", "https://www.raykovagro.bg"]
const configuredOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean)

const allowedOrigins = [...new Set([...defaultOrigins, ...configuredOrigins].map(normalizeOrigin))]

const requiredEnvVars = ["EMAIL_USER", "EMAIL_PASS", "EMAIL_TO"]
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key])

if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(", ")}`)
  process.exit(1)
}

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  family: 4,
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
})

const sendEmailLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.RATE_LIMIT_MAX || 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests. Please try again later.",
  },
})

app.set("trust proxy", 1)
app.use(helmet())

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)

    try {
      const normalizedOrigin = normalizeOrigin(origin)
      const { hostname } = new URL(normalizedOrigin)

      if (
        allowedOrigins.includes(normalizedOrigin) ||
        hostname === "raykovagro.bg" ||
        hostname === "www.raykovagro.bg"
      ) {
        return callback(null, true)
      }
    } catch {
      return callback(new Error("CORS origin not allowed"))
    }

    return callback(new Error("CORS origin not allowed"))
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  optionsSuccessStatus: 204,
}

app.use(cors(corsOptions))
app.options("*", cors(corsOptions))

app.use(express.json({ limit: "50kb" }))

app.get("/", (req, res) => {
  res.status(200).send("Backend is running")
})

app.get("/send-email", (req, res) => {
  res.status(200).send("Use POST for /send-email")
})

app.post("/send-email", sendEmailLimiter, async (req, res) => {
  try {
    const { name, email, message } = req.body || {}

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        error: "Missing fields",
      })
    }

    if (String(name).length > 120 || String(email).length > 254 || String(message).length > 4000) {
      return res.status(400).json({
        success: false,
        error: "Input too long",
      })
    }

    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO,
      subject: `Message from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
      replyTo: email,
    })

    return res.status(200).json({
      success: true,
      message: "Message sent successfully",
      id: info.messageId,
    })
  } catch (error) {
    console.error("SEND EMAIL ERROR:", error?.message)

    return res.status(500).json({
      success: false,
      error: "Server error",
    })
  }
})

app.use((error, req, res, next) => {
  if (error?.message === "CORS origin not allowed") {
    return res.status(403).json({
      success: false,
      error: "Origin not allowed",
    })
  }

  return next(error)
})

const PORT = process.env.PORT || 8080

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})