const ParkingRecord = require("../models/ParkingRecord");
const recognizePlate = require("../utils/recognizePlate_fastapi");

exports.receiveUID = async (req, res) => {
    try {
        const { uid, cameraIndex } = req.body;

        console.log(`Nhận UID từ ESP32: ${uid}, Camera: ${cameraIndex}`);

        // TODO: Tự động chụp ảnh từ camera tương ứng
        // Hiện tại chỉ log UID nhận được

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

        // Tạo record mới
        const newRecord = new ParkingRecord({
            rfid: uid,
            licensePlate: licensePlate,
            timeIn: new Date(),
            cameraIndex: cameraIndex,
        });

        await newRecord.save();

        res.json({
            message: "Auto capture successful",
            uid: uid,
            licensePlate: licensePlate,
            cameraIndex: cameraIndex,
            timestamp: new Date(),
        });
    } catch (err) {
        console.error("Lỗi khi tự động chụp:", err);
        res.status(500).json({ error: err.message });
    }
};
