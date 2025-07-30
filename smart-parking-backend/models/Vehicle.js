const mongoose = require("mongoose");

const VehicleSchema = new mongoose.Schema({
  licensePlate: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  vehicleType: {
    type: String,
    enum: ["car", "truck", "bus"],
    default: "car",
  },
  isRegistered: {
    type: Boolean,
    default: true,
  },
  registrationDate: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Index for faster queries
VehicleSchema.index({ licensePlate: 1 });
VehicleSchema.index({ userId: 1 });

module.exports = mongoose.model("Vehicle", VehicleSchema); 