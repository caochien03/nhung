const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authenticateToken } = require("../middleware/auth");

// Public routes
router.post("/login", authController.login);
router.post("/register", authController.register);

// Protected routes
router.get("/me", authenticateToken, authController.getCurrentUser);
router.put("/profile", authenticateToken, authController.updateProfile);
router.put("/change-password", authenticateToken, authController.changePassword);

module.exports = router; 