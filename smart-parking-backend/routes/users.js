const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

// All routes require authentication
router.use(authenticateToken);

// User-specific routes (for regular users)
router.get("/vehicles", userController.getUserVehicles);
router.post("/vehicles", userController.registerVehicle);
router.delete("/vehicles/:vehicleId", userController.removeVehicle);
router.get("/parking/history", userController.getUserParkingHistory);
router.get("/parking/active", userController.getUserActiveParking);
router.get("/payments/history", userController.getUserPaymentHistory);
router.get("/dashboard/stats", userController.getUserDashboardStats);

// Admin-only routes
router.use(authorizeRole("admin"));

router.get("/", userController.getAllUsers);
router.get("/:id", userController.getUserById);
router.put("/:id", userController.updateUser);
router.delete("/:id", userController.deleteUser);
router.put("/:id/balance", userController.updateUserBalance);

module.exports = router; 