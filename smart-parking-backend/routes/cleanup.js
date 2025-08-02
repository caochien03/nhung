const express = require("express");
const router = express.Router();
const cleanupController = require("../controllers/cleanupController");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

// Chỉ admin mới có thể truy cập các routes này
router.use(authenticateToken);
router.use(authorizeRole("admin"));

// Chạy cleanup thủ công
router.post("/manual", cleanupController.runManualCleanup);

// Lấy thống kê lưu trữ
router.get("/stats", cleanupController.getStorageStats);

module.exports = router;
