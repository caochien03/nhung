require('dotenv').config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// Import routes
const parkingRoutes = require("./routes/parking");
const esp32Routes = require("./routes/esp32Routes");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const paymentRoutes = require("./routes/payments");
const dashboardRoutes = require("./routes/dashboard");
const barrieRoutes = require("./routes/barrie");
const cameraRoutes = require("./routes/camera");
const subscriptionRoutes = require("./routes/subscriptions");
const cleanupRoutes = require("./routes/cleanup");
const testRoutes = require("./routes/test");

// Import database and websocket
const connectDB = require("./config/db");
const http = require("http");
const setupWebSocket = require("./websocket");

const app = express();
const PORT = process.env.PORT || 8080;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
});
app.use(limiter);

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Body parsing middleware
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

// Health check route
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Smart Parking Backend is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/parking", parkingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/esp32", esp32Routes);
app.use("/api/barrie", barrieRoutes);
app.use("/api/camera", cameraRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/cleanup", cleanupRoutes);
app.use("/api/test", testRoutes);

// Root route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Smart Parking System API",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      parking: "/api/parking",
      payments: "/api/payments",
      dashboard: "/api/dashboard",
      esp32: "/api/esp32",
      subscriptions: "/api/subscriptions",
      cleanup: "/api/cleanup"
    },
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Error:", error);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? error.message : undefined,
  });
});

// Connect to MongoDB
connectDB();

// Start subscription background jobs
const { startSubscriptionJobs } = require("./jobs/subscriptionJobs");
startSubscriptionJobs();

// Start cleanup background jobs
const { cleanupOldData, weeklyStorageReport } = require("./jobs/cleanupJobs");
cleanupOldData();
weeklyStorageReport();

// Create HTTP server and setup WebSocket
const server = http.createServer(app);
setupWebSocket(server);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Smart Parking System API running on port ${PORT}`);
  console.log(`📊 WebSocket server ready for real-time communication`);
  console.log(`🎫 Subscription management system active`);
  console.log(`🧹 Cleanup jobs scheduled (daily at 2:00 AM & weekly storage reports)`);
  console.log(`☁️  Cloudinary integration ready for image storage`);
});
