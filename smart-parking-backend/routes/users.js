const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

// All routes require authentication
router.use(authenticateToken);

// Admin only routes
router.get("/", authorizeRole("admin"), userController.getUsers);
router.post("/", authorizeRole("admin"), userController.createUser);
router.get("/:id", authorizeRole("admin"), userController.getUserById);
router.put("/:id", authorizeRole("admin"), userController.updateUser);
router.delete("/:id", authorizeRole("admin"), userController.deleteUser);
router.put("/:id/balance", authorizeRole("admin"), userController.updateBalance);

// User vehicle management
router.get("/:userId/vehicles", userController.getUserVehicles);
router.post("/:userId/vehicles", userController.registerVehicle);

module.exports = router; 