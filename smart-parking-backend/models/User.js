const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  role: {
    type: String,
    enum: ["admin", "staff", "user"],
    default: "user",
  },
  balance: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: {
    type: Date,
  },
  licensePlates: [{
    type: String,
    trim: true,
    uppercase: true,
  }],
  subscriptionStatus: {
    type: String,
    enum: ["none", "active", "expired", "cancelled"],
    default: "none",
  },
  subscriptionEndDate: {
    type: Date,
  },
  subscriptionType: {
    type: String,
    enum: ["monthly", "quarterly", "yearly"],
  },
  vehicleCount: {
    type: Number,
    default: 0,
  },
  maxVehicles: {
    type: Number,
    default: 1,
  },
}, {
  timestamps: true,
});

// Hash password before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Check if user has active subscription
UserSchema.methods.hasActiveSubscription = function() {
  return this.subscriptionStatus === "active" && 
         this.subscriptionEndDate && 
         new Date() <= this.subscriptionEndDate;
};

// Update subscription status
UserSchema.methods.updateSubscriptionStatus = function() {
  if (this.subscriptionEndDate && new Date() > this.subscriptionEndDate) {
    this.subscriptionStatus = "expired";
  }
  return this.save();
};

// Get remaining subscription days
UserSchema.methods.getSubscriptionRemainingDays = function() {
  if (!this.hasActiveSubscription()) return 0;
  const diffTime = this.subscriptionEndDate - new Date();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

module.exports = mongoose.model("User", UserSchema); 