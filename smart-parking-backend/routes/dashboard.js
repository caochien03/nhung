const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

// All routes require authentication
router.use(authenticateToken);

// Dashboard routes
router.get("/stats", dashboardController.getStats);
router.get("/revenue", authorizeRole("admin"), dashboardController.getRevenue);
router.get("/revenue/today", authorizeRole("admin", "staff"), dashboardController.getTodayRevenue);
router.get("/parking-stats", authorizeRole("admin"), dashboardController.getParkingStats);
router.get("/system-status", authorizeRole("admin"), dashboardController.getSystemStatus);

module.exports = router; 