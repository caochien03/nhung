const ParkingRecord = require("../models/ParkingRecord");
const User = require("../models/User");
const Vehicle = require("../models/Vehicle");
const subscriptionController = require("./subscriptionController");
const recognizePlate = require("../utils/recognizePlate_fastapi");
const { calculateFeeWithSubscription } = require("../utils/feeCalculator");

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

// Cache để tránh duplicate processing
const processingCache = new Map(); // uid -> { timestamp, processing: boolean }
const PROCESSING_TIMEOUT = 5000; // 5 giây

// Cleanup old cache entries
setInterval(() => {
    const now = Date.now();
    for (const [uid, data] of processingCache.entries()) {
        if (now - data.timestamp > PROCESSING_TIMEOUT) {
            processingCache.delete(uid);
        }
    }
}, 30000); // Cleanup mỗi 30 giây

// Kiểm tra vé tháng và mở cổng
exports.checkSubscriptionAndOpenGate = async (req, res) => {
    try {
        const { licensePlate, cameraIndex } = req.body;

        console.log(`Kiểm tra vé tháng - Biển số: ${licensePlate}, Camera: ${cameraIndex}`);

        if (!licensePlate) {
            return res.status(400).json({
                success: false,
                message: "License plate is required",
                canOpen: false,
            });
        }

        // Tìm xe đã đăng ký
        const vehicle = await Vehicle.findOne({
            licensePlate: licensePlate.toUpperCase(),
            isActive: true
        }).populate("userId");

        if (!vehicle || !vehicle.userId) {
            return res.json({
                success: false,
                message: "Vehicle not registered",
                canOpen: false,
                reason: "Xe chưa được đăng ký trong hệ thống",
            });
        }

        // Kiểm tra vé tháng
        const subscriptionCheck = await subscriptionController.checkSubscriptionForParking(
            vehicle.userId._id, 
            licensePlate
        );

        if (!subscriptionCheck.hasSubscription || !subscriptionCheck.canUse) {
            return res.json({
                success: false,
                message: "No valid subscription",
                canOpen: false,
                reason: subscriptionCheck.reason || "Không có vé tháng hợp lệ",
            });
        }

        // Gửi lệnh mở cổng qua WebSocket tới ESP32
        const gateCommand = {
            type: "open_gate",
            cameraIndex: cameraIndex,
            licensePlate: licensePlate,
            reason: "subscription",
            timestamp: new Date(),
        };

        wsClients.forEach((ws) => {
            if (ws.readyState === 1) {
                ws.send(JSON.stringify(gateCommand));
            }
        });

        res.json({
            success: true,
            message: "Gate opened for subscription user",
            canOpen: true,
            subscription: {
                type: subscriptionCheck.subscription.type,
                remainingDays: subscriptionCheck.remainingDays,
            },
            licensePlate: licensePlate,
            cameraIndex: cameraIndex,
            timestamp: new Date(),
        });

    } catch (err) {
        console.error("Lỗi khi kiểm tra vé tháng:", err);
        res.status(500).json({ 
            success: false,
            message: "Internal server error",
            canOpen: false,
            error: err.message 
        });
    }
};

exports.receiveUID = async (req, res) => {
    try {
        const { uid, cameraIndex } = req.body;

        console.log(`Nhận UID từ ESP32: ${uid}, Camera: ${cameraIndex}`);

        // Kiểm tra cache để tránh spam WebSocket messages
        const cacheKey = `ws-${uid}-${cameraIndex}`;
        const now = Date.now();
        
        if (processingCache.has(cacheKey)) {
            const cached = processingCache.get(cacheKey);
            if ((now - cached.timestamp) < 2000) { // 2 giây debounce cho WebSocket
                console.log(`⏳ WebSocket message gần đây - UID: ${uid}, Camera: ${cameraIndex}`);
                return res.json({
                    message: "UID received successfully (cached)",
                    uid: uid,
                    cameraIndex: cameraIndex,
                    timestamp: new Date(),
                });
            }
        }

        // Đánh dấu đã gửi WebSocket message
        processingCache.set(cacheKey, { timestamp: now, processing: false });

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

        // Kiểm tra cache để tránh duplicate processing
        const cacheKey = `${uid}-${cameraIndex}`;
        const now = Date.now();
        
        if (processingCache.has(cacheKey)) {
            const cached = processingCache.get(cacheKey);
            if (cached.processing || (now - cached.timestamp) < PROCESSING_TIMEOUT) {
                console.log(`⏳ Đang xử lý hoặc đã xử lý gần đây - UID: ${uid}, Camera: ${cameraIndex}`);
                return res.json({
                    message: "Request ignored - already processing or recently processed",
                    action: "IGNORED",
                    uid: uid,
                    cameraIndex: cameraIndex,
                    timestamp: new Date(),
                });
            }
        }

        // Đánh dấu đang xử lý
        processingCache.set(cacheKey, { timestamp: now, processing: true });

        // Nhận diện biển số từ ảnh
        let licensePlate = "";
        if (imageData) {
            licensePlate = await recognizePlate(imageData);
        }

        if (cameraIndex === 1) {
            // CAMERA VÀO - Tạo record mới
            
            // Tìm user dựa trên biển số
            let userId = null;
            let paymentType = "hourly";
            let subscriptionId = null;
            
            if (licensePlate) {
                const vehicle = await Vehicle.findOne({
                    licensePlate: licensePlate.toUpperCase(),
                    isActive: true
                }).populate("userId");

                if (vehicle && vehicle.userId) {
                    userId = vehicle.userId._id;
                    
                    // Kiểm tra vé tháng
                    const subscriptionCheck = await subscriptionController.checkSubscriptionForParking(
                        userId, 
                        licensePlate
                    );
                    
                    if (subscriptionCheck.hasSubscription && subscriptionCheck.canUse) {
                        paymentType = "subscription";
                        subscriptionId = subscriptionCheck.subscription._id;
                    }
                }
            }

            const newRecord = new ParkingRecord({
                rfid: uid,
                licensePlate: licensePlate,
                userId: userId,
                timeIn: new Date(),
                cameraIndex: cameraIndex,
                status: "active", // Đảm bảo set status active
                paymentType: paymentType,
                subscriptionId: subscriptionId,
                paymentMethod: paymentType === "subscription" ? "subscription" : undefined,
                paymentStatus: paymentType === "subscription" ? "paid" : "pending",
            });

            await newRecord.save();

            res.json({
                message: "Vehicle entered - Record created",
                action: "IN",
                uid: uid,
                licensePlate: licensePlate,
                cameraIndex: cameraIndex,
                paymentType: paymentType,
                subscriptionUsed: paymentType === "subscription",
                shouldOpenGate: paymentType === "subscription", // Tự động mở cổng cho vé tháng
                userId: userId,
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

                // Tính phí sử dụng hàm mới
                const hasSubscription = existingRecord.paymentType === "subscription";
                const feeInfo = calculateFeeWithSubscription(
                    existingRecord.timeIn, 
                    timeOut, 
                    hasSubscription
                );
                
                let paymentMethod = existingRecord.paymentMethod;
                let paymentStatus = existingRecord.paymentStatus;

                if (hasSubscription) {
                    paymentMethod = "subscription";
                    paymentStatus = "paid";
                } else {
                    paymentStatus = "pending";
                }

                existingRecord.timeOut = timeOut;
                existingRecord.fee = feeInfo.fee;
                existingRecord.feeType = feeInfo.feeType;
                existingRecord.originalFee = feeInfo.originalFee;
                existingRecord.subscriptionDiscount = feeInfo.subscriptionDiscount || 0;
                existingRecord.status = "completed";
                existingRecord.paymentMethod = paymentMethod;
                
                // Chỉ set paid nếu là subscription, còn lại để pending
                if (hasSubscription) {
                    existingRecord.paymentStatus = "paid";
                } else {
                    existingRecord.paymentStatus = "pending"; // Chờ nhân viên xác nhận
                }
                
                await existingRecord.save();

                // Nếu cần thanh toán, gửi WebSocket notification cho staff
                if (!hasSubscription && feeInfo.fee > 0) {
                    const paymentNotification = {
                        type: "payment_required",
                        parkingRecord: {
                            _id: existingRecord._id,
                            licensePlate: exitPlate,
                            timeIn: timeIn,
                            timeOut: timeOut,
                            fee: feeInfo.fee,
                            feeType: feeInfo.feeType,
                            parkingDuration: durationDisplay,
                            paymentStatus: "pending"
                        },
                        message: "Xe cần thanh toán - Vui lòng xác nhận",
                        timestamp: new Date(),
                    };

                    wsClients.forEach((ws) => {
                        if (ws.readyState === 1) {
                            ws.send(JSON.stringify(paymentNotification));
                        }
                    });
                }

                res.json({
                    message: hasSubscription ? "Vehicle exited - Subscription used" : "Vehicle exited - Payment required",
                    action: hasSubscription ? "OUT_SUBSCRIPTION" : "OUT_PAYMENT_REQUIRED",
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
                    parkingHours: `${feeInfo.parkingHours} giờ`,
                    billingHours: feeInfo.feeType,
                    originalFee: `${feeInfo.originalFee.toLocaleString()} VND`,
                    fee: feeInfo.fee > 0 ? `${feeInfo.fee.toLocaleString()} VND` : "MIỄN PHÍ (Vé tháng)",
                    feeNumber: feeInfo.fee,
                    paymentType: existingRecord.paymentType,
                    subscriptionUsed: existingRecord.paymentType === "subscription",
                    subscriptionDiscount: feeInfo.subscriptionDiscount > 0 ? `${feeInfo.subscriptionDiscount.toLocaleString()} VND` : null,
                    paymentStatus: existingRecord.paymentStatus,
                    requiresStaffConfirmation: !hasSubscription, // Cần xác nhận nhân viên
                    parkingRecordId: existingRecord._id, // ID để xác nhận thanh toán
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
        
        // Reset processing state trong cache
        const cacheKey = `${req.body.uid}-${req.body.cameraIndex}`;
        if (processingCache.has(cacheKey)) {
            processingCache.set(cacheKey, { 
                timestamp: Date.now(), 
                processing: false 
            });
        }
        
        res.status(500).json({ error: err.message });
    } finally {
        // Đảm bảo reset processing state
        const cacheKey = `${req.body.uid}-${req.body.cameraIndex}`;
        if (processingCache.has(cacheKey)) {
            processingCache.set(cacheKey, { 
                timestamp: Date.now(), 
                processing: false 
            });
        }
    }
};

// API để nhân viên xác nhận thanh toán và mở cổng
exports.confirmPayment = async (req, res) => {
    try {
        const { parkingRecordId, recordId, paymentMethod = "cash", staffNote } = req.body;
        
        // Support both parameter names for compatibility
        const actualRecordId = parkingRecordId || recordId;
        
        console.log('Confirm payment request:', { actualRecordId, paymentMethod, body: req.body });

        if (!actualRecordId) {
            return res.status(400).json({
                success: false,
                message: "Missing parking record ID"
            });
        }

        const record = await ParkingRecord.findById(actualRecordId);
        if (!record) {
            return res.status(404).json({
                success: false,
                message: "Parking record not found"
            });
        }

        if (record.paymentStatus === "paid") {
            return res.status(400).json({
                success: false,
                message: "Payment already confirmed"
            });
        }

        // Cập nhật trạng thái thanh toán
        record.paymentStatus = "paid";
        record.paymentMethod = paymentMethod;
        if (staffNote) {
            record.notes = staffNote;
        }
        await record.save();

        // Gửi lệnh mở cổng qua WebSocket
        const gateCommand = {
            type: "open_gate",
            cameraIndex: 2, // Cổng ra
            licensePlate: record.licensePlate,
            reason: "payment_confirmed",
            amount: record.fee,
            paymentMethod: paymentMethod,
            timestamp: new Date(),
        };

        wsClients.forEach((ws) => {
            if (ws.readyState === 1) {
                ws.send(JSON.stringify(gateCommand));
            }
        });

        // Broadcast payment completion để cập nhật UI
        const paymentNotification = {
            type: "payment_completed",
            parkingRecord: record,
            timestamp: new Date(),
        };

        wsClients.forEach((ws) => {
            if (ws.readyState === 1) {
                ws.send(JSON.stringify(paymentNotification));
            }
        });

        res.json({
            success: true,
            message: "Payment confirmed - Gate opened",
            data: {
                parkingRecordId: record._id,
                licensePlate: record.licensePlate,
                amount: record.fee,
                paymentMethod: paymentMethod,
                gateOpened: true
            }
        });

    } catch (err) {
        console.error("Lỗi khi xác nhận thanh toán:", err);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error",
            error: err.message 
        });
    }
};
