const express = require("express");
const router = express.Router();
const parkingController = require("../controllers/parkingController");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

// Public routes (for ESP32)
router.post("/", parkingController.createParkingRecord);

// Protected routes
router.use(authenticateToken);

router.get("/", parkingController.getParkingRecords);
router.get("/active", parkingController.getActiveRecords);
router.get("/stats", authorizeRole("admin"), parkingController.getParkingStats);
router.get("/:id", parkingController.getParkingRecordById);
router.put("/:id/complete", authorizeRole("admin", "staff"), parkingController.completeRecord);
router.get("/user/:userId/history", parkingController.getUserParkingHistory);

module.exports = router;
