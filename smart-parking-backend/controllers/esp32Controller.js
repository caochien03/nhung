const ParkingRecord = require("../models/ParkingRecord");
const recognizePlate = require("../utils/recognizePlate_fastapi");

// Hàm tính độ tương đồng giữa 2 chuỗi (Levenshtein distance)
function calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 1;

    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;

    for (let i = 0; i <= len2; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= len1; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= len2; i++) {
        for (let j = 1; j <= len1; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    const maxLen = Math.max(len1, len2);
    return (maxLen - matrix[len2][len1]) / maxLen;
}

// Lưu trữ WebSocket clients
let wsClients = [];
exports.setWsClients = (clients) => {
    wsClients = clients;
};

exports.receiveUID = async (req, res) => {
    try {
        const { uid, cameraIndex } = req.body;

        console.log(`Nhận UID từ ESP32: ${uid}, Camera: ${cameraIndex}`);

        // Gửi signal tới tất cả frontend qua WebSocket
        wsClients.forEach((ws) => {
            if (ws.readyState === 1) {
                ws.send(
                    JSON.stringify({
                        type: "auto_capture",
                        uid,
                        cameraIndex,
                    })
                );
            }
        });

        res.json({
            message: "UID received successfully",
            uid: uid,
            cameraIndex: cameraIndex,
            timestamp: new Date(),
        });
    } catch (err) {
        console.error("Lỗi khi xử lý UID:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.autoCapture = async (req, res) => {
    try {
        const { uid, cameraIndex, imageData } = req.body;

        console.log(`Tự động chụp ảnh - UID: ${uid}, Camera: ${cameraIndex}`);

        // Nhận diện biển số từ ảnh
        let licensePlate = "";
        if (imageData) {
            licensePlate = await recognizePlate(imageData);
        }

        if (cameraIndex === 1) {
            // CAMERA VÀO - Tạo record mới
            const newRecord = new ParkingRecord({
                rfid: uid,
                licensePlate: licensePlate,
                timeIn: new Date(),
                cameraIndex: cameraIndex,
            });

            await newRecord.save();

            res.json({
                message: "Vehicle entered - Record created",
                action: "IN",
                uid: uid,
                licensePlate: licensePlate,
                cameraIndex: cameraIndex,
                timestamp: new Date(),
            });
        } else if (cameraIndex === 2) {
            // CAMERA RA - Tìm record có cùng UID và chưa có timeOut
            const existingRecord = await ParkingRecord.findOne({
                rfid: uid,
                timeOut: { $exists: false },
            }).sort({ timeIn: -1 });

            if (existingRecord) {
                // Kiểm tra biển số có khớp nhau không
                const entryPlate = existingRecord.licensePlate || "";
                const exitPlate = licensePlate || "";

                // Hàm so sánh biển số (bỏ qua khoảng trắng và ký tự đặc biệt)
                const normalizePlate = (plate) =>
                    plate.replace(/[\s*-]/g, "").toUpperCase();
                const normalizedEntry = normalizePlate(entryPlate);
                const normalizedExit = normalizePlate(exitPlate);

                // Kiểm tra độ tương đồng (cho phép sai khác nhỏ do OCR không chính xác)
                const similarity = calculateSimilarity(
                    normalizedEntry,
                    normalizedExit
                );
                const isPlateMatch = similarity >= 0.7; // 70% giống nhau

                if (!isPlateMatch && entryPlate && exitPlate) {
                    // Biển số không khớp - cảnh báo bảo mật
                    res.json({
                        message: "License plate mismatch - Security alert",
                        action: "OUT_SECURITY_ALERT",
                        uid: uid,
                        entryPlate: entryPlate,
                        exitPlate: exitPlate,
                        similarity: Math.round(similarity * 100) + "%",
                        cameraIndex: cameraIndex,
                        warning: "Biển số vào và ra không khớp!",
                        timestamp: new Date(),
                    });
                    return;
                }

                // Cập nhật thời gian ra và tính tiền
                const timeOut = new Date();
                const timeIn = existingRecord.timeIn;
                const parkingDurationMs = timeOut - timeIn;

                // Tính thời gian đỗ xe chính xác
                const totalSeconds = Math.floor(parkingDurationMs / 1000);
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;

                // Format thời gian hiển thị
                let durationDisplay = "";
                if (hours > 0) {
                    durationDisplay += `${hours}h `;
                }
                if (minutes > 0) {
                    durationDisplay += `${minutes}m `;
                }
                durationDisplay += `${seconds}s`;

                // Tính tiền (vẫn làm tròn lên giờ cho việc tính phí)
                const parkingHours = Math.ceil(
                    parkingDurationMs / (1000 * 60 * 60)
                );
                const hourlyRate = 10000; // 10,000 VND/giờ
                const fee = parkingHours * hourlyRate;

                existingRecord.timeOut = timeOut;
                existingRecord.fee = fee;
                await existingRecord.save();

                res.json({
                    message: "Vehicle exited - Fee calculated",
                    action: "OUT",
                    uid: uid,
                    entryPlate: entryPlate,
                    exitPlate: exitPlate,
                    plateMatch: isPlateMatch ? "✓ Khớp" : "⚠ Không khớp",
                    similarity: Math.round(similarity * 100) + "%",
                    cameraIndex: cameraIndex,
                    timeIn: timeIn,
                    timeOut: timeOut,
                    timeInFormatted: timeIn.toLocaleTimeString("vi-VN", {
                        hour12: false,
                    }),
                    timeOutFormatted: timeOut.toLocaleTimeString("vi-VN", {
                        hour12: false,
                    }),
                    parkingDuration: durationDisplay,
                    parkingDurationMs: parkingDurationMs,
                    billingHours: `${parkingHours} giờ`,
                    fee: `${fee.toLocaleString()} VND`,
                    feeNumber: fee,
                    entryInfo: `${entryPlate} - ${timeIn.toLocaleTimeString(
                        "vi-VN",
                        { hour12: false }
                    )}`,
                    exitInfo: `${exitPlate} - ${timeOut.toLocaleTimeString(
                        "vi-VN",
                        { hour12: false }
                    )}`,
                    timestamp: new Date(),
                });
            } else {
                // Không tìm thấy record vào - có thể là lỗi hoặc xe chưa vào
                res.json({
                    message: "No entry record found for this UID",
                    action: "OUT_ERROR",
                    uid: uid,
                    licensePlate: licensePlate,
                    cameraIndex: cameraIndex,
                    error: "Xe chưa được ghi nhận vào bãi",
                    timestamp: new Date(),
                });
            }
        }
    } catch (err) {
        console.error("Lỗi khi tự động chụp:", err);
        res.status(500).json({ error: err.message });
    }
};
