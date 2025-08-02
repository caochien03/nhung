const mongoose = require("mongoose");

const ParkingRecordSchema = new mongoose.Schema({
  rfid: {
    type: String,
    required: true,
  },
  licensePlate: {
    type: String,
    trim: true,
    uppercase: true,
  },
  imageUrl: {
    type: String,
  },
  timeIn: {
    type: Date,
    required: true,
  },
  timeOut: {
    type: Date,
  },
  fee: {
    type: Number,
    default: 0,
  },
  feeType: {
    type: String, // "Theo giờ (35k)", "Qua đêm (50k)", "Miễn phí (Vé tháng)"
  },
  originalFee: {
    type: Number, // Phí gốc trước khi áp dụng vé tháng
  },
  subscriptionDiscount: {
    type: Number,
    default: 0,
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subscription",
  },
  paymentType: {
    type: String,
    enum: ["hourly", "subscription", "mixed"],
    default: "hourly",
  },
  cameraIndex: {
    type: Number,
    required: true,
    enum: [1, 2], // 1: vào, 2: ra
  },
  status: {
    type: String,
    enum: ["active", "completed", "cancelled"],
    default: "active",
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed"],
    default: "pending",
  },
  paymentMethod: {
    type: String,
    enum: ["qr", "cash", "balance", "subscription"],
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  isRegisteredUser: {
    type: Boolean,
    default: false,
  },
  notes: {
    type: String,
  },
}, {
  timestamps: true,
});

// Index for faster queries
ParkingRecordSchema.index({ rfid: 1 });
ParkingRecordSchema.index({ licensePlate: 1 });
ParkingRecordSchema.index({ status: 1 });
ParkingRecordSchema.index({ timeIn: -1 });
ParkingRecordSchema.index({ userId: 1 });

// Virtual for parking duration
ParkingRecordSchema.virtual("duration").get(function() {
  if (!this.timeOut) return null;
  return this.timeOut - this.timeIn;
});

// Virtual for formatted duration
ParkingRecordSchema.virtual("durationFormatted").get(function() {
  if (!this.timeOut) return null;
  
  const duration = this.timeOut - this.timeIn;
  const hours = Math.floor(duration / (1000 * 60 * 60));
  const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((duration % (1000 * 60)) / 1000);
  
  let result = "";
  if (hours > 0) result += `${hours}h `;
  if (minutes > 0) result += `${minutes}m `;
  result += `${seconds}s`;
  
  return result;
});

module.exports = mongoose.model("ParkingRecord", ParkingRecordSchema);
