const mongoose = require("mongoose");

const CameraSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  location: {
    type: String,
    required: true,
    enum: ["entrance", "exit"],
  },
  status: {
    type: String,
    enum: ["online", "offline", "error", "maintenance"],
    default: "offline",
  },
  lastImage: {
    type: String, // base64 image data
  },
  lastLicensePlate: {
    type: String,
    trim: true,
  },
  lastUpdate: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  notes: {
    type: String,
    trim: true,
  },
  ipAddress: {
    type: String,
    trim: true,
  },
  port: {
    type: Number,
    default: 80,
  },
}, {
  timestamps: true,
});

// Index for faster queries
CameraSchema.index({ location: 1, status: 1 });
CameraSchema.index({ lastUpdate: -1 });

module.exports = mongoose.model("Camera", CameraSchema); 