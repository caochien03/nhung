const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

// All routes require authentication
router.use(authenticateToken);

// Payment routes
router.post("/", paymentController.createPayment);
router.get("/", authorizeRole("admin", "staff"), paymentController.getPayments);
router.get("/stats", authorizeRole("admin"), paymentController.getPaymentStats);
router.get("/record/:parkingRecordId", paymentController.getPaymentByRecord);
router.post("/qr", paymentController.generateQR);
router.post("/qr/complete", paymentController.completeQRPayment);

module.exports = router; 