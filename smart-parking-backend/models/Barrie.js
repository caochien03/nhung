const mongoose = require("mongoose");

const BarrieSchema = new mongoose.Schema({
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
    enum: ["open", "closed", "error", "maintenance"],
    default: "closed",
  },
  lastAction: {
    type: Date,
    default: Date.now,
  },
  lastActionBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  lastActionReason: {
    type: String,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

// Index for faster queries
BarrieSchema.index({ location: 1, status: 1 });
BarrieSchema.index({ lastAction: -1 });

module.exports = mongoose.model("Barrie", BarrieSchema); 