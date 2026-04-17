// ✅ LOAD ENVIRONMENT VARIABLES FIRST
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

console.log("ENV CHECK:", process.env.DATABASE_URL);

import express from "express";
import env from "./config/env.js";
import connectDB from "./config/db.js"; // ✅ change here

import authRoutes from "./routes/authRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import portfolioRoutes from "./routes/portfolioRoutes.js";
import riskRoutes from "./routes/riskRoutes.js";

const app = express();

app.use(express.json());

// Root test route
app.get("/", (req, res) => {
  res.json({ message: "API is running..." });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/risk", riskRoutes);

// health route
app.get("/api/health", (req, res) => {
  res.json({ status: "OK" });
});

// ✅ Start server ONLY after DB connects
const startServer = async () => {
  try {
    await connectDB(); // ✅ ensures DB is ready first

    app.listen(env.PORT, () => {
      console.log(`✅ Server running on port ${env.PORT}`);
      console.log(`✅ Environment variables loaded from .env`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();