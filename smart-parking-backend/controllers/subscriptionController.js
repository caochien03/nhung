const Subscription = require("../models/Subscription");
const Payment = require("../models/Payment");
const User = require("../models/User");
const ParkingRecord = require("../models/ParkingRecord");
const Vehicle = require("../models/Vehicle");

// Pricing configuration
const SUBSCRIPTION_PRICES = {
  monthly: 1500000, // 1 triệu 5
  quarterly: 4200000, // 3 tháng - giảm 6%
  yearly: 15000000, // 12 tháng - giảm 17%
};

// Get user's active subscription
exports.getActiveSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      userId: req.user._id,
      status: "active",
      paymentStatus: "paid",
      endDate: { $gte: new Date() }
    }).populate("paymentId");

    res.json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    console.error("Get active subscription error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get user's subscription history
exports.getSubscriptionHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const subscriptions = await Subscription.find({
      userId: req.user._id,
    })
    .populate("paymentId", "transactionId createdAt")
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const total = await Subscription.countDocuments({
      userId: req.user._id,
    });

    res.json({
      success: true,
      data: subscriptions,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        totalSubscriptions: total,
      },
    });
  } catch (error) {
    console.error("Get subscription history error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Create new subscription
exports.createSubscription = async (req, res) => {
  try {
    const { type = "monthly", paymentMethod = "balance", vehicleLimit = 1 } = req.body;

    if (!SUBSCRIPTION_PRICES[type]) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription type",
      });
    }

    // Check if user already has active subscription
    const activeSubscription = await Subscription.findOne({
      userId: req.user._id,
      status: "active",
      paymentStatus: "paid",
      endDate: { $gte: new Date() }
    });

    if (activeSubscription) {
      return res.status(400).json({
        success: false,
        message: "You already have an active subscription",
      });
    }

    const price = SUBSCRIPTION_PRICES[type];
    const startDate = new Date();
    let endDate = new Date();

    // Calculate end date
    switch (type) {
      case "monthly":
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case "quarterly":
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case "yearly":
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
    }

    // Check payment method
    if (paymentMethod === "balance") {
      const user = await User.findById(req.user._id);
      if (user.balance < price) {
        return res.status(400).json({
          success: false,
          message: "Insufficient balance",
        });
      }

      // Deduct from balance
      user.balance -= price;
      await user.save();

      // Create payment record
      const payment = new Payment({
        parkingRecordId: null, // No parking record for subscription
        amount: price,
        method: "balance",
        status: "completed",
        transactionId: `SUB${Date.now()}`,
        processedBy: req.user._id,
        notes: `Subscription payment - ${type}`,
      });
      await payment.save();

      // Create subscription
      const subscription = new Subscription({
        userId: req.user._id,
        type,
        startDate,
        endDate,
        price,
        status: "active",
        vehicleLimit,
        paymentStatus: "paid",
        paymentId: payment._id,
      });

      await subscription.save();

      res.status(201).json({
        success: true,
        message: "Subscription created successfully",
        data: subscription,
      });

    } else if (paymentMethod === "qr") {
      // Create pending subscription for QR payment
      const subscription = new Subscription({
        userId: req.user._id,
        type,
        startDate,
        endDate,
        price,
        status: "pending",
        vehicleLimit,
        paymentStatus: "pending",
      });

      await subscription.save();

      // Generate QR code (simplified)
      const qrCode = `data:image/png;base64,${Buffer.from(JSON.stringify({
        amount: price,
        subscriptionId: subscription._id,
        type: "subscription",
        timestamp: Date.now(),
      })).toString("base64")}`;

      res.status(201).json({
        success: true,
        message: "Subscription created, please complete payment",
        data: {
          subscription,
          qrCode,
        },
      });

    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method",
      });
    }

  } catch (error) {
    console.error("Create subscription error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Complete QR payment for subscription
exports.completeSubscriptionPayment = async (req, res) => {
  try {
    const { subscriptionId, transactionId } = req.body;

    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      userId: req.user._id,
      paymentStatus: "pending"
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Pending subscription not found",
      });
    }

    // Create payment record
    const payment = new Payment({
      parkingRecordId: null,
      amount: subscription.price,
      method: "qr",
      status: "completed",
      transactionId,
      processedBy: req.user._id,
      notes: `Subscription QR payment - ${subscription.type}`,
    });
    await payment.save();

    // Update subscription
    subscription.status = "active";
    subscription.paymentStatus = "paid";
    subscription.paymentId = payment._id;
    await subscription.save();

    res.json({
      success: true,
      message: "Subscription payment completed successfully",
      data: subscription,
    });
  } catch (error) {
    console.error("Complete subscription payment error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Cancel subscription
exports.cancelSubscription = async (req, res) => {
  try {
    const { id } = req.params;

    const subscription = await Subscription.findOne({
      _id: id,
      userId: req.user._id,
      status: "active"
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Active subscription not found",
      });
    }

    subscription.status = "cancelled";
    await subscription.save();

    res.json({
      success: true,
      message: "Subscription cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Check subscription for parking
exports.checkSubscriptionForParking = async (userId, licensePlate) => {
  try {
    // Find active subscription
    const subscription = await Subscription.findOne({
      userId,
      status: "active",
      paymentStatus: "paid",
      endDate: { $gte: new Date() }
    });

    if (!subscription) {
      return { hasSubscription: false };
    }

    // Check if license plate belongs to user
    const vehicle = await Vehicle.findOne({
      userId,
      licensePlate: licensePlate.toUpperCase(),
      isActive: true
    });

    if (!vehicle) {
      return { hasSubscription: false };
    }

    // Check vehicle limit
    const activeParking = await ParkingRecord.countDocuments({
      userId,
      status: "active",
      paymentType: "subscription"
    });

    if (activeParking >= subscription.vehicleLimit) {
      return { 
        hasSubscription: true, 
        canUse: false,
        reason: "Vehicle limit exceeded"
      };
    }

    return {
      hasSubscription: true,
      canUse: true,
      subscription,
      remainingDays: subscription.getRemainingDays()
    };

  } catch (error) {
    console.error("Check subscription error:", error);
    return { hasSubscription: false };
  }
};

// Get subscription pricing
exports.getSubscriptionPricing = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        pricing: SUBSCRIPTION_PRICES,
        currency: "VND",
        features: {
          monthly: {
            price: SUBSCRIPTION_PRICES.monthly,
            duration: "1 tháng",
            vehicleLimit: 1,
            savings: 0,
          },
          quarterly: {
            price: SUBSCRIPTION_PRICES.quarterly,
            duration: "3 tháng",
            vehicleLimit: 1,
            savings: (SUBSCRIPTION_PRICES.monthly * 3 - SUBSCRIPTION_PRICES.quarterly),
          },
          yearly: {
            price: SUBSCRIPTION_PRICES.yearly,
            duration: "12 tháng",
            vehicleLimit: 1,
            savings: (SUBSCRIPTION_PRICES.monthly * 12 - SUBSCRIPTION_PRICES.yearly),
          }
        }
      },
    });
  } catch (error) {
    console.error("Get subscription pricing error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin: Get all subscriptions
exports.getAllSubscriptions = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type } = req.query;

    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;

    const subscriptions = await Subscription.find(query)
      .populate("userId", "username email")
      .populate("paymentId", "transactionId method")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Subscription.countDocuments(query);

    res.json({
      success: true,
      data: subscriptions,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        totalSubscriptions: total,
      },
    });
  } catch (error) {
    console.error("Get all subscriptions error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Check and update expired subscriptions (cron job)
exports.updateExpiredSubscriptions = async () => {
  try {
    const expiredSubscriptions = await Subscription.find({
      status: "active",
      endDate: { $lt: new Date() }
    });

    for (const subscription of expiredSubscriptions) {
      subscription.status = "expired";
      await subscription.save();
    }

    console.log(`Updated ${expiredSubscriptions.length} expired subscriptions`);
  } catch (error) {
    console.error("Update expired subscriptions error:", error);
  }
};

module.exports = exports;
