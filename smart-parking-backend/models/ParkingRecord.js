const mongoose = require("mongoose");

const ParkingRecordSchema = new mongoose.Schema({
    rfid: String,
    licensePlate: String,
    imageUrl: String, // Đường dẫn ảnh hoặc base64
    timeIn: Date,
    timeOut: Date,
    fee: Number,
});

module.exports = mongoose.model("ParkingRecord", ParkingRecordSchema);
