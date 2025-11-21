import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 🔐 Environment Variables
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "koushikashwik57@gmail.com";
let ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "koushik@27";
const JWT_SECRET = process.env.JWT_SECRET || "mysecretkey";

const EMAIL_USER = process.env.EMAIL_USER || "koushikashwik57@gmail.com";
const EMAIL_PASS = process.env.EMAIL_PASS || "zaarajxyquqhyabu"; // App password

// 🧠 OTP Store (with expiry)
let otpStore = {}; // { email: { otp, expiresAt } }

// 📩 Nodemailer setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

// 🧠 LOGIN
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: "1h" });
    return res.json({ success: true, token });
  } else {
    return res.status(401).json({ success: false, message: "Invalid email or password" });
  }
});

// 🧠 SEND OTP
app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (email !== ADMIN_EMAIL) {
    return res.status(404).json({ success: false, message: "Email not found" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000);
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  otpStore[email] = { otp, expiresAt };

  try {
    await transporter.sendMail({
      from: `"Medical Store Billing" <${EMAIL_USER}>`,
      to: email,
      subject: "Password Reset OTP - Medical Store Billing",
      text: `Your OTP for password reset is: ${otp}. It will expire in 5 minutes.`,
    });

    res.json({ success: true, message: "OTP sent successfully to your email." });
  } catch (error) {
    console.error("Mail error:", error);
    res.status(500).json({ success: false, message: "Failed to send OTP." });
  }
});

// 🧠 VERIFY OTP
app.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore[email];

  if (!record) {
    return res.status(400).json({ success: false, message: "No OTP found for this email." });
  }

  if (Date.now() > record.expiresAt) {
    delete otpStore[email];
    return res.status(400).json({ success: false, message: "OTP expired." });
  }

  if (record.otp.toString() === otp.toString()) {
    delete otpStore[email];
    return res.json({ success: true, message: "OTP verified successfully." });
  }

  return res.status(400).json({ success: false, message: "Invalid OTP." });
});

// 🧠 RESET PASSWORD
app.post("/reset-password", (req, res) => {
  const { email, newPassword } = req.body;
  if (email === ADMIN_EMAIL) {
    ADMIN_PASSWORD = newPassword;
    return res.json({ success: true, message: "Password updated successfully." });
  } else {
    return res.status(404).json({ success: false, message: "User not found." });
  }
});

// 🧠 RESEND OTP (optional)
app.post("/resend-otp", async (req, res) => {
  const { email } = req.body;
  if (email !== ADMIN_EMAIL) {
    return res.status(404).json({ success: false, message: "Email not found" });
  }
  const otp = Math.floor(100000 + Math.random() * 900000);
  const expiresAt = Date.now() + 5 * 60 * 1000;
  otpStore[email] = { otp, expiresAt };

  try {
    await transporter.sendMail({
      from: `"Medical Store Billing" <${EMAIL_USER}>`,
      to: email,
      subject: "Resent OTP - Medical Store Billing",
      text: `Your new OTP is: ${otp}. It will expire in 5 minutes.`,
    });
    res.json({ success: true, message: "OTP resent successfully." });
  } catch (error) {
    console.error("Mail error:", error);
    res.status(500).json({ success: false, message: "Failed to resend OTP." });
  }
});

app.listen(5000, () => console.log("✅ Backend running at http://localhost:5000"));
