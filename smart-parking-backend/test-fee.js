const { calculateParkingFee, calculateFeeWithSubscription } = require('./utils/feeCalculator');

// Test cases
console.log("=== TEST TÍNH PHÍ ĐỖ XE ===\n");

// Test 1: Đỗ xe trong ngày (< 9h tối)
const timeIn1 = new Date('2025-08-02 14:00:00');
const timeOut1 = new Date('2025-08-02 16:30:00');
console.log("Test 1: Đỗ xe trong ngày (14:00 → 16:30)");
console.log("Input:", timeIn1.toLocaleString('vi-VN'), "→", timeOut1.toLocaleString('vi-VN'));
console.log("Output:", calculateParkingFee(timeIn1, timeOut1));
console.log("");

// Test 2: Đỗ xe qua 9h tối
const timeIn2 = new Date('2025-08-02 19:00:00');
const timeOut2 = new Date('2025-08-02 22:00:00');
console.log("Test 2: Đỗ xe qua 9h tối (19:00 → 22:00)");
console.log("Input:", timeIn2.toLocaleString('vi-VN'), "→", timeOut2.toLocaleString('vi-VN'));
console.log("Output:", calculateParkingFee(timeIn2, timeOut2));
console.log("");

// Test 3: Đỗ xe qua đêm
const timeIn3 = new Date('2025-08-02 22:00:00');
const timeOut3 = new Date('2025-08-03 08:00:00');
console.log("Test 3: Đỗ xe qua đêm (22:00 → 08:00 ngày hôm sau)");
console.log("Input:", timeIn3.toLocaleString('vi-VN'), "→", timeOut3.toLocaleString('vi-VN'));
console.log("Output:", calculateParkingFee(timeIn3, timeOut3));
console.log("");

// Test 4: Đỗ xe ngắn (18 giây như test trước)
const timeIn4 = new Date();
const timeOut4 = new Date(timeIn4.getTime() + 18000); // 18 giây
console.log("Test 4: Đỗ xe ngắn (18 giây)");
console.log("Input:", timeIn4.toLocaleString('vi-VN'), "→", timeOut4.toLocaleString('vi-VN'));
console.log("Output:", calculateParkingFee(timeIn4, timeOut4));
console.log("");

// Test 5: Với vé tháng
console.log("Test 5: Có vé tháng (qua đêm)");
console.log("Input:", timeIn3.toLocaleString('vi-VN'), "→", timeOut3.toLocaleString('vi-VN'), "+ Subscription");
console.log("Output:", calculateFeeWithSubscription(timeIn3, timeOut3, true));
console.log("");

console.log("=== BẢNG GIÁ ===");
console.log("• Mặc định: 35,000 VND");
console.log("• Qua 9h tối (21:00): 50,000 VND");
console.log("• Vé tháng: MIỄN PHÍ");
