const express = require("express");
const router = express.Router();
const barrieController = require("../controllers/barrieController");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

// All routes require authentication
router.use(authenticateToken);

// Staff and admin can access barrie routes
router.use(authorizeRole("admin", "staff"));

// Get all barries
router.get("/", barrieController.getBarries);

// Get barrie by ID
router.get("/:id", barrieController.getBarrieById);

// Control barrie (open/close)
router.post("/:id/control", barrieController.controlBarrie);

// Get barrie status
router.get("/status/all", barrieController.getBarrieStatus);

module.exports = router; 