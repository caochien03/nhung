const express = require("express");
const router = express.Router();
const esp32Controller = require("../controllers/esp32Controller");

// ESP32 gửi UID
router.post("/uid", esp32Controller.receiveUID);

// ESP32 gửi ảnh + UID để tự động chụp
router.post("/auto-capture", esp32Controller.autoCapture);

// Kiểm tra vé tháng và mở cổng
router.post("/check-subscription", esp32Controller.checkSubscriptionAndOpenGate);

// Kiểm tra vé tháng cho cổng vào (test endpoint)
router.post("/check-subscription-gate", esp32Controller.checkSubscriptionAndOpenGate);

module.exports = router;
