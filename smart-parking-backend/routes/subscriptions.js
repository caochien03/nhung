const express = require("express");
const router = express.Router();
const subscriptionController = require("../controllers/subscriptionController");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

// All routes require authentication
router.use(authenticateToken);

// User subscription routes
router.get("/active", subscriptionController.getActiveSubscription);
router.get("/all-active", subscriptionController.getAllActiveSubscriptions);
router.get("/history", subscriptionController.getSubscriptionHistory);
router.get("/pricing", subscriptionController.getSubscriptionPricing);
router.post("/create", subscriptionController.createSubscription);
router.post("/complete-payment", subscriptionController.completeSubscriptionPayment);
router.post("/extend", subscriptionController.extendSubscription);
router.put("/:id/cancel", subscriptionController.cancelSubscription);

// Admin routes
router.get("/", authorizeRole("admin"), subscriptionController.getAllSubscriptions);
router.get("/stats", authorizeRole(["admin", "staff"]), subscriptionController.getSubscriptionStats);

module.exports = router;
