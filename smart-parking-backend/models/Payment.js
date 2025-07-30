const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
  parkingRecordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ParkingRecord",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  method: {
    type: String,
    enum: ["qr", "cash", "balance"],
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending",
  },
  qrCode: {
    type: String,
  },
  transactionId: {
    type: String,
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  notes: {
    type: String,
  },
}, {
  timestamps: true,
});

// Index for faster queries
PaymentSchema.index({ parkingRecordId: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Payment", PaymentSchema); 