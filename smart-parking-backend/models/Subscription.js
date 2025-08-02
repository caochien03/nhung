const mongoose = require("mongoose");

const SubscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: ["monthly", "quarterly", "yearly"],
    default: "monthly",
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["active", "expired", "cancelled", "pending"],
    default: "pending",
  },
  vehicleLimit: {
    type: Number,
    default: 1, // Số xe tối đa được gửi miễn phí
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed"],
    default: "pending",
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Payment",
  },
  autoRenew: {
    type: Boolean,
    default: false,
  },
  notes: {
    type: String,
  },
  usageCount: {
    type: Number,
    default: 0,
  },
  lastUsed: {
    type: Date,
  },
  renewalNotified: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Indexes for better performance
SubscriptionSchema.index({ userId: 1, status: 1 });
SubscriptionSchema.index({ endDate: 1, status: 1 });

// Check if subscription is valid
SubscriptionSchema.methods.isValid = function() {
  return this.status === "active" && 
         this.paymentStatus === "paid" && 
         new Date() <= this.endDate;
};

// Check if subscription is expired
SubscriptionSchema.methods.isExpired = function() {
  return new Date() > this.endDate;
};

// Get remaining days
SubscriptionSchema.methods.getRemainingDays = function() {
  const now = new Date();
  const diffTime = this.endDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Update usage count
SubscriptionSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsed = new Date();
  return this.save();
};

// Check if needs renewal notification
SubscriptionSchema.methods.needsRenewalNotification = function() {
  const daysLeft = this.getRemainingDays();
  return daysLeft <= 7 && daysLeft > 0 && !this.renewalNotified;
};

// Static method to find expired subscriptions
SubscriptionSchema.statics.findExpired = function() {
  return this.find({
    status: "active",
    endDate: { $lt: new Date() }
  });
};

// Static method to find subscriptions needing renewal notification
SubscriptionSchema.statics.findNeedingRenewal = function() {
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  
  return this.find({
    status: "active",
    endDate: { $lte: sevenDaysFromNow, $gt: new Date() },
    renewalNotified: false
  });
};

module.exports = mongoose.model("Subscription", SubscriptionSchema);
