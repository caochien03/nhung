const express = require("express");
const router = express.Router();
const cameraController = require("../controllers/cameraController");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

// All routes require authentication
router.use(authenticateToken);

// Staff and admin can access camera routes
router.use(authorizeRole("admin", "staff"));

// Get all cameras
router.get("/", cameraController.getCameras);

// Get camera by ID
router.get("/:id", cameraController.getCameraById);

// Update camera status
router.put("/:id/status", cameraController.updateCameraStatus);

// Capture image from camera
router.post("/:id/capture", cameraController.captureImage);

// Get camera status
router.get("/status/all", cameraController.getCameraStatus);

module.exports = router; 