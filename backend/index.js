import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "./db/config.js";
import { mainRouter } from "./src/api/routes.js";
import { errorHandler } from "./src/middleware/error-handler.js";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT) || 3777;

// Trust the first proxy hop (required on Render / any reverse-proxy host)
// so express-rate-limit can read X-Forwarded-For correctly.
app.set("trust proxy", 1);

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://ai-powered-evangadi-forum.onrender.com",
      "https://ai-powered-evangadi-forum-7glsgwi1o-tagelehaylemeskels-projects.vercel.app",
      "https://ai-powered-evangadi-forum.vercel.app",
    ],
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads
app.use("/uploads", express.static("uploads"));

// Static frontend files (if built and served from backend)
app.use(express.static(path.join(__dirname, "../frontend/dist")));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date() });
});

// Readiness check - verifies DB connectivity
app.get("/ready", async (req, res) => {
  try {
    const conn = await db.getConnection();
    conn.release();
    return res.json({ ready: true, db: "connected" });
  } catch (err) {
    return res
      .status(503)
      .json({ ready: false, db: "disconnected", error: err.message });
  }
});

app.use("/api", mainRouter);

// SPA fallback: serve index.html for unknown routes not handled by API
app.use((req, res, next) => {
  if (
    req.method !== "GET" ||
    req.path.startsWith("/api") ||
    req.path.startsWith("/uploads")
  ) {
    return next();
  }
  res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
});

app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const connection = await db.getConnection();

    console.log("Database connection established successfully.");
    connection.release();

    app.listen(port, (err) => {
      if (err) {
        console.error("Failed to start the server:", err.message);
        process.exit(1);
      }
      console.log(`Server running on port http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to connect to the database. Server not started.");
    console.error(error);
    process.exit(1);
  }
};

startServer();
