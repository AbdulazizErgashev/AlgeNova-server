import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import mathRoutes from "./routes/mathRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "0.0.0.0"; // barcha interfeysda ishlashi uchun

// 🔒 Security middlewares
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" })); // katta JSON requestlar uchun limit
app.use(morgan("dev"));

// 🚦 Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minut
  max: 100, // minutiga 100ta request
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// 📌 Routes
app.use("/api/math", mathRoutes);

app.get("/", (req, res) => {
  res.send("✅ AlgeNova API is running...");
});

app.get("/ping", (req, res) => {
  res.status(200).json({ message: "pong" });
});

// 🚀 Server start
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running at http://${HOST}:${PORT}`);
});
