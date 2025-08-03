const express = require("express");
const router = express.Router();
const parkingController = require("../controllers/parkingController");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

// Public routes (for ESP32)
router.post("/", parkingController.createParkingRecord);

// Protected routes
router.use(authenticateToken);

// Specific routes first (before /:id)
router.get("/active", parkingController.getActiveRecords);
router.get("/pending-payments", authorizeRole("admin", "staff"), parkingController.getPendingPayments);
router.get("/stats", authorizeRole("admin"), parkingController.getParkingStats);
router.get("/history-with-images", authorizeRole("admin", "staff"), parkingController.getParkingHistoryWithImages);
router.get("/history-range", authorizeRole("admin", "staff"), parkingController.getParkingHistoryRange);
router.get("/user/:userId/history", parkingController.getUserParkingHistory);

// Generic routes with parameters last
router.get("/", parkingController.getParkingRecords);
router.get("/:id", parkingController.getParkingRecordById);
router.get("/:id/with-images", authorizeRole("admin", "staff"), parkingController.getParkingRecordWithImages);
router.put("/:id/complete", authorizeRole("admin", "staff"), parkingController.completeRecord);

module.exports = router;
