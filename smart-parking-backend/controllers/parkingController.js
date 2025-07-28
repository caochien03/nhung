const ParkingRecord = require("../models/ParkingRecord");
const recognizePlate = require("../utils/recognizePlate_fastapi");

exports.createParkingRecord = async (req, res) => {
    try {
        let { rfid, image, licensePlate, action } = req.body;

        // Nếu chỉ có image (chụp ảnh để nhận diện), không lưu DB
        if (image && !action) {
            licensePlate = await recognizePlate(image);
            return res.json({
                message: "Plate recognized",
                licensePlate: licensePlate || "Không nhận diện được",
            });
        }

        // Nếu có action (vào/ra), mới lưu DB
        if (!licensePlate && image) {
            licensePlate = await recognizePlate(image);
        }

        const newRecord = new ParkingRecord({
            rfid,
            licensePlate,
            timeIn: action === "in" ? new Date() : undefined,
            timeOut: action === "out" ? new Date() : undefined,
        });
        await newRecord.save();
        res.json({
            message: "Record created",
            action: action,
            licensePlate: licensePlate || "Không nhận diện được",
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getParkingRecords = async (req, res) => {
    try {
        const records = await ParkingRecord.find().sort({ timeIn: -1 });
        res.json(records);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
