const ParkingRecord = require("../models/ParkingRecord");
const User = require("../models/User");
const Vehicle = require("../models/Vehicle");
const subscriptionController = require("./subscriptionController");
const recognizePlate = require("../utils/recognizePlate_fastapi");
const { calculateFeeWithSubscription } = require("../utils/feeCalculator");
const { uploadBase64Image } = require("../utils/cloudinaryHelper");
const { findBestMatch } = require("../utils/licensePlateHelper");

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

        // Tìm xe đã đăng ký với fuzzy matching
        let vehicle = await Vehicle.findOne({
            licensePlate: licensePlate.toUpperCase(),
            isActive: true
        }).populate("userId");

        // Nếu không tìm thấy exact match, thử fuzzy matching
        if (!vehicle) {
            const allVehicles = await Vehicle.find({ isActive: true }).populate("userId");
            const registeredPlates = allVehicles.map(v => v.licensePlate);
            
            const bestMatch = findBestMatch(licensePlate, registeredPlates, 0.75);
            
            if (bestMatch && bestMatch.isMatch) {
                vehicle = allVehicles.find(v => v.licensePlate === bestMatch.registeredPlate);
                console.log(`🔍 Fuzzy match found: OCR "${licensePlate}" → Registered "${bestMatch.registeredPlate}" (score: ${bestMatch.score.toFixed(3)})`);
            }
        }

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
        
        console.log(`🎯 ESP32 RFID received - UID: ${uid}, Camera: ${cameraIndex}`);

        // **KIỂM TRA CAPACITY BÃI ĐỖ XE**
        const MAX_PARKING_CAPACITY = 4; // Giới hạn 4 vị trí
        
        if (cameraIndex === 1) { // Cổng vào
            const currentActiveParkings = await ParkingRecord.countDocuments({ 
                status: "active",
                timeOut: { $exists: false }
            });
            
            console.log(`🅿️ Parking status: ${currentActiveParkings}/${MAX_PARKING_CAPACITY} slots occupied`);
            
            if (currentActiveParkings >= MAX_PARKING_CAPACITY) {
                console.log(`🚨 PARKING FULL! Cannot allow entry. Current: ${currentActiveParkings}/${MAX_PARKING_CAPACITY}`);
                
                // Gửi WebSocket notification về bãi đầy
                const fullMessage = {
                    type: "parking_full",
                    message: "Bãi đỗ xe đã đầy!",
                    currentCapacity: currentActiveParkings,
                    maxCapacity: MAX_PARKING_CAPACITY,
                    uid: uid,
                    cameraIndex: cameraIndex,
                    timestamp: new Date().toISOString()
                };

                wsClients.forEach(client => {
                    if (client.readyState === client.OPEN) {
                        client.send(JSON.stringify(fullMessage));
                    }
                });

                return res.json({
                    message: `🚨 BÃI ĐỖ XE ĐÃ ĐẦY! (${currentActiveParkings}/${MAX_PARKING_CAPACITY})`,
                    action: "DENY_ENTRY_FULL_CAPACITY",
                    uid: uid,
                    cameraIndex: cameraIndex,
                    currentCapacity: currentActiveParkings,
                    maxCapacity: MAX_PARKING_CAPACITY,
                    timestamp: new Date().toISOString()
                });
            }
        }

        // Tiếp tục logic bình thường nếu còn chỗ trống
        // Gọi WebSocket để trigger auto capture
        const autoCaptureMessage = {
            type: "auto_capture",
            uid: uid,
            cameraIndex: cameraIndex,
            timestamp: new Date().toISOString()
        };

        wsClients.forEach(client => {
            if (client.readyState === client.OPEN) {
                client.send(JSON.stringify(autoCaptureMessage));
            }
        });

        res.json({
            message: "UID received successfully",
            uid: uid,
            cameraIndex: cameraIndex,
            action: "AUTO_CAPTURE",
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("ESP32 UID receive error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
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

        // Nhận diện biển số từ ảnh hoặc lấy từ request body
        let licensePlate = req.body.licensePlate || "";
        let uploadedImageData = null;
        
        if (imageData) {
            // Upload ảnh lên Cloudinary trước khi nhận diện
            try {
                const action = cameraIndex === 1 ? 'in' : 'out';
                uploadedImageData = await uploadBase64Image(
                    imageData, 
                    'unknown', // Sẽ update lại sau khi nhận diện
                    action, 
                    cameraIndex
                );
                console.log(`📸 Image uploaded to Cloudinary: ${uploadedImageData.url}`);
            } catch (uploadError) {
                console.error('Error uploading image:', uploadError);
                // Tiếp tục xử lý mà không có ảnh
            }
            
            // Nhận diện biển số từ ảnh (ghi đè licensePlate nếu có ảnh)
            const recognizedPlate = await recognizePlate(imageData);
            if (recognizedPlate) {
                licensePlate = recognizedPlate;
            }
        }

        if (cameraIndex === 1) {
            // CAMERA VÀO - Tạo record mới
            
            // Tìm user dựa trên biển số
            let userId = null;
            let paymentType = "hourly";
            let subscriptionId = null;
            
            if (licensePlate) {
                let vehicle = await Vehicle.findOne({
                    licensePlate: licensePlate.toUpperCase(),
                    isActive: true
                }).populate("userId");

                // Nếu không tìm thấy exact match, thử fuzzy matching
                if (!vehicle) {
                    const allVehicles = await Vehicle.find({ isActive: true }).populate("userId");
                    const registeredPlates = allVehicles.map(v => v.licensePlate);
                    
                    const bestMatch = findBestMatch(licensePlate, registeredPlates, 0.75);
                    
                    if (bestMatch && bestMatch.isMatch) {
                        vehicle = allVehicles.find(v => v.licensePlate === bestMatch.registeredPlate);
                        console.log(`🔍 Fuzzy match: "${licensePlate}" → "${bestMatch.registeredPlate}"`);
                    }
                }

                if (vehicle && vehicle.userId) {
                    userId = vehicle.userId._id;
                    
                    // Kiểm tra vé tháng với logic cải tiến
                    const subscriptionCheck = await subscriptionController.checkSubscriptionForParking(
                        userId, 
                        licensePlate
                    );
                    
                    if (subscriptionCheck.hasSubscription) {
                        paymentType = "subscription";
                        subscriptionId = subscriptionCheck.subscription._id;
                        
                        // Log thông tin sử dụng vé tháng
                        console.log(`✅ Subscription used - User: ${vehicle.userId.username}, Vehicle: ${licensePlate}, Days left: ${subscriptionCheck.remainingDays}`);
                    }
                }
            }

            const recordData = {
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
            };

            // Thêm ảnh vào nếu có
            if (uploadedImageData) {
                recordData.entryImage = uploadedImageData;
            }

            const newRecord = new ParkingRecord(recordData);

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
                // Kiểm tra biển số có khớp nhau không sử dụng fuzzy matching
                const entryPlate = existingRecord.licensePlate || "";
                const exitPlate = licensePlate || "";

                let isPlateMatch = false;
                let matchScore = 0;

                if (entryPlate && exitPlate) {
                    // Sử dụng fuzzy matching để kiểm tra
                    const matchResult = findBestMatch(exitPlate, [entryPlate], 0.7);
                    if (matchResult && matchResult.isMatch) {
                        isPlateMatch = true;
                        matchScore = matchResult.score;
                        console.log(`🔍 Exit plate match: "${exitPlate}" → "${entryPlate}" (score: ${matchScore.toFixed(3)})`);
                    } else {
                        // Fallback to old similarity calculation
                        const normalizePlate = (plate) =>
                            plate.replace(/[\s*-]/g, "").toUpperCase();
                        const normalizedEntry = normalizePlate(entryPlate);
                        const normalizedExit = normalizePlate(exitPlate);
                        
                        matchScore = calculateSimilarity(normalizedEntry, normalizedExit);
                        isPlateMatch = matchScore >= 0.7;
                    }
                } else {
                    // Nếu thiếu thông tin biển số, cho phép đi qua
                    isPlateMatch = true;
                    matchScore = 1.0;
                }

                if (!isPlateMatch && entryPlate && exitPlate) {
                    // Biển số không khớp - cảnh báo bảo mật
                    res.json({
                        message: "License plate mismatch - Security alert",
                        action: "OUT_SECURITY_ALERT",
                        uid: uid,
                        entryPlate: entryPlate,
                        exitPlate: exitPlate,
                        similarity: Math.round(matchScore * 100) + "%",
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
                
                // Thêm ảnh ra nếu có
                if (uploadedImageData) {
                    existingRecord.exitImage = uploadedImageData;
                }
                
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
                    licensePlate: exitPlate || entryPlate, // Hiển thị biển số
                    entryPlate: entryPlate,
                    exitPlate: exitPlate,
                    plateMatch: isPlateMatch ? "✓ Khớp" : "⚠ Không khớp",
                    similarity: Math.round(matchScore * 100) + "%",
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
