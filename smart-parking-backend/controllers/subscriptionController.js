const Subscription = require("../models/Subscription");
const Payment = require("../models/Payment");
const User = require("../models/User");
const ParkingRecord = require("../models/ParkingRecord");
const Vehicle = require("../models/Vehicle");

// Pricing configuration with enhanced features
const SUBSCRIPTION_PRICES = {
  monthly: 1500000, // 1 triệu 5
  quarterly: 4200000, // 3 tháng - giảm 6%
  yearly: 15000000, // 12 tháng - giảm 17%
};

// Enhanced vehicle limits based on subscription type
const VEHICLE_LIMITS = {
  monthly: 1,
  quarterly: 2,
  yearly: 3,
};

// Discount rates for bulk subscriptions
const BULK_DISCOUNTS = {
  quarterly: 0.06, // 6% discount
  yearly: 0.17,    // 17% discount
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

// Create new subscription with enhanced validation
exports.createSubscription = async (req, res) => {
  try {
    const { type = "monthly", paymentMethod = "balance", vehicleLimit } = req.body;

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
        message: "You already have an active subscription. Please wait for it to expire or cancel it first.",
        data: {
          currentSubscription: {
            type: activeSubscription.type,
            endDate: activeSubscription.endDate,
            remainingDays: activeSubscription.getRemainingDays()
          }
        }
      });
    }

    const price = SUBSCRIPTION_PRICES[type];
    const maxVehicleLimit = VEHICLE_LIMITS[type] || 1;
    const finalVehicleLimit = Math.min(vehicleLimit || 1, maxVehicleLimit);
    
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
          data: {
            required: price,
            current: user.balance,
            shortage: price - user.balance
          }
        });
      }

      // Deduct from balance
      user.balance -= price;
      
      // Update user subscription info
      user.subscriptionStatus = "active";
      user.subscriptionEndDate = endDate;
      user.subscriptionType = type;
      user.maxVehicles = finalVehicleLimit;
      
      await user.save();

      // Create payment record
      const payment = new Payment({
        parkingRecordId: null, // No parking record for subscription
        amount: price,
        method: "balance",
        status: "completed",
        transactionId: `SUB${Date.now()}`,
        processedBy: req.user._id,
        notes: `Subscription payment - ${type} (${finalVehicleLimit} vehicles)`,
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
        vehicleLimit: finalVehicleLimit,
        paymentStatus: "paid",
        paymentId: payment._id,
      });

      await subscription.save();

      res.status(201).json({
        success: true,
        message: "Subscription created successfully",
        data: {
          subscription,
          payment,
          userBalance: user.balance,
          vehicleLimit: finalVehicleLimit,
          maxVehicleLimit
        },
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
        vehicleLimit: finalVehicleLimit,
        paymentStatus: "pending",
      });

      await subscription.save();

      // Generate QR code (enhanced)
      const qrData = {
        amount: price,
        subscriptionId: subscription._id,
        type: "subscription",
        timestamp: Date.now(),
        vehicleLimit: finalVehicleLimit,
        description: `Vé tháng ${type} - ${finalVehicleLimit} xe`
      };
      
      const qrCode = `data:image/png;base64,${Buffer.from(JSON.stringify(qrData)).toString("base64")}`;

      res.status(201).json({
        success: true,
        message: "Subscription created, please complete payment",
        data: {
          subscription,
          qrCode,
          qrData,
          paymentInstructions: "Scan QR code to complete payment within 15 minutes"
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

// Check subscription for parking with enhanced logic
exports.checkSubscriptionForParking = async (userId, licensePlate) => {
  try {
    // Update expired subscriptions first
    await exports.updateExpiredSubscriptions();
    
    // Find active subscription
    const subscription = await Subscription.findOne({
      userId,
      status: "active",
      paymentStatus: "paid",
      endDate: { $gte: new Date() }
    });

    if (!subscription) {
      return { 
        hasSubscription: false, 
        reason: "No active subscription found"
      };
    }

    // Check if license plate belongs to user
    const vehicle = await Vehicle.findOne({
      userId,
      licensePlate: licensePlate.toUpperCase(),
      isActive: true
    });

    if (!vehicle) {
      return { 
        hasSubscription: false, 
        reason: "Vehicle not registered to user"
      };
    }

    // Check vehicle limit - count currently parked vehicles with subscription
    const currentlyParked = await ParkingRecord.countDocuments({
      userId,
      status: "active",
      paymentType: "subscription",
      timeOut: { $exists: false }
    });

    if (currentlyParked >= subscription.vehicleLimit) {
      return { 
        hasSubscription: true, 
        canUse: false,
        reason: `Vehicle limit exceeded (${currentlyParked}/${subscription.vehicleLimit})`,
        subscription
      };
    }

    // Update usage statistics
    subscription.incrementUsage();

    return {
      hasSubscription: true,
      canUse: true,
      subscription,
      remainingDays: subscription.getRemainingDays(),
      vehicleLimit: subscription.vehicleLimit,
      currentlyParked
    };

  } catch (error) {
    console.error("Check subscription error:", error);
    return { 
      hasSubscription: false, 
      reason: "System error",
      error: error.message 
    };
  }
};

// Update expired subscriptions
exports.updateExpiredSubscriptions = async () => {
  try {
    const expiredSubscriptions = await Subscription.findExpired();
    
    for (const subscription of expiredSubscriptions) {
      // Update subscription status
      subscription.status = "expired";
      await subscription.save();
      
      // Update user status
      const user = await User.findById(subscription.userId);
      if (user) {
        user.subscriptionStatus = "expired";
        await user.save();
      }
    }
    
    return expiredSubscriptions.length;
  } catch (error) {
    console.error("Update expired subscriptions error:", error);
    return 0;
  }
};

// Send renewal notifications
exports.sendRenewalNotifications = async () => {
  try {
    const subscriptionsNeedingRenewal = await Subscription.findNeedingRenewal();
    
    for (const subscription of subscriptionsNeedingRenewal) {
      // Mark as notified
      subscription.renewalNotified = true;
      await subscription.save();
      
      // Here you would integrate with notification service
      console.log(`Renewal notification sent for subscription ${subscription._id}`);
    }
    
    return subscriptionsNeedingRenewal.length;
  } catch (error) {
    console.error("Send renewal notifications error:", error);
    return 0;
  }
};

// Get subscription pricing with enhanced features
exports.getSubscriptionPricing = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        pricing: SUBSCRIPTION_PRICES,
        vehicleLimits: VEHICLE_LIMITS,
        discounts: BULK_DISCOUNTS,
        currency: "VND",
        features: {
          monthly: {
            price: SUBSCRIPTION_PRICES.monthly,
            duration: "1 tháng",
            vehicleLimit: VEHICLE_LIMITS.monthly,
            savings: 0,
            description: "Gói cơ bản cho 1 xe",
            benefits: ["Đỗ xe miễn phí", "Ưu tiên vào bãi", "Hỗ trợ 24/7"]
          },
          quarterly: {
            price: SUBSCRIPTION_PRICES.quarterly,
            duration: "3 tháng",
            vehicleLimit: VEHICLE_LIMITS.quarterly,
            savings: (SUBSCRIPTION_PRICES.monthly * 3 - SUBSCRIPTION_PRICES.quarterly),
            description: "Gói phổ biến cho 2 xe",
            benefits: ["Đỗ xe miễn phí", "Ưu tiên vào bãi", "Hỗ trợ 24/7", "Tiết kiệm 6%", "Báo cáo thống kê"]
          },
          yearly: {
            price: SUBSCRIPTION_PRICES.yearly,
            duration: "12 tháng",
            vehicleLimit: VEHICLE_LIMITS.yearly,
            savings: (SUBSCRIPTION_PRICES.monthly * 12 - SUBSCRIPTION_PRICES.yearly),
            description: "Gói tiết kiệm cho 3 xe",
            benefits: ["Đỗ xe miễn phí", "Ưu tiên vào bãi", "Hỗ trợ 24/7", "Tiết kiệm 17%", "Báo cáo thống kê", "Chỗ đỗ ưu tiên"]
          }
        },
        paymentMethods: [
          {
            id: "balance",
            name: "Số dư tài khoản",
            description: "Thanh toán ngay lập tức từ số dư"
          },
          {
            id: "qr",
            name: "Quét mã QR",
            description: "Thanh toán qua ứng dụng ngân hàng"
          }
        ]
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

// Get subscription statistics
exports.getSubscriptionStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      totalActive,
      totalExpired,
      monthlyRevenue,
      yearlyRevenue,
      typeDistribution,
      expiringNext7Days
    ] = await Promise.all([
      // Active subscriptions
      Subscription.countDocuments({ status: "active" }),
      
      // Expired subscriptions
      Subscription.countDocuments({ status: "expired" }),
      
      // Monthly revenue
      Subscription.aggregate([
        { 
          $match: { 
            status: "active",
            createdAt: { $gte: startOfMonth }
          }
        },
        { $group: { _id: null, total: { $sum: "$price" } } }
      ]),
      
      // Yearly revenue
      Subscription.aggregate([
        { 
          $match: { 
            status: "active",
            createdAt: { $gte: startOfYear }
          }
        },
        { $group: { _id: null, total: { $sum: "$price" } } }
      ]),
      
      // Type distribution
      Subscription.aggregate([
        { $match: { status: "active" } },
        { $group: { _id: "$type", count: { $sum: 1 } } }
      ]),
      
      // Expiring in next 7 days
      Subscription.countDocuments({
        status: "active",
        endDate: { 
          $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          $gt: now
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalActive,
        totalExpired,
        monthlyRevenue: monthlyRevenue[0]?.total || 0,
        yearlyRevenue: yearlyRevenue[0]?.total || 0,
        typeDistribution,
        expiringNext7Days,
        conversionRate: totalActive / (totalActive + totalExpired) * 100
      }
    });
  } catch (error) {
    console.error("Get subscription stats error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Extend subscription
exports.extendSubscription = async (req, res) => {
  try {
    const { subscriptionId, extensionType = "monthly" } = req.body;
    
    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      userId: req.user._id,
      status: "active"
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Active subscription not found",
      });
    }

    const extensionPrice = SUBSCRIPTION_PRICES[extensionType];
    const user = await User.findById(req.user._id);

    if (user.balance < extensionPrice) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance for extension",
        data: {
          required: extensionPrice,
          current: user.balance
        }
      });
    }

    // Extend the subscription
    const currentEndDate = new Date(subscription.endDate);
    let newEndDate = new Date(currentEndDate);

    switch (extensionType) {
      case "monthly":
        newEndDate.setMonth(newEndDate.getMonth() + 1);
        break;
      case "quarterly":
        newEndDate.setMonth(newEndDate.getMonth() + 3);
        break;
      case "yearly":
        newEndDate.setFullYear(newEndDate.getFullYear() + 1);
        break;
    }

    // Update subscription
    subscription.endDate = newEndDate;
    subscription.renewalNotified = false;
    await subscription.save();

    // Deduct payment
    user.balance -= extensionPrice;
    user.subscriptionEndDate = newEndDate;
    await user.save();

    // Create payment record
    const payment = new Payment({
      parkingRecordId: null,
      amount: extensionPrice,
      method: "balance",
      status: "completed",
      transactionId: `EXT${Date.now()}`,
      processedBy: req.user._id,
      notes: `Subscription extension - ${extensionType}`,
    });
    await payment.save();

    res.json({
      success: true,
      message: "Subscription extended successfully",
      data: {
        subscription,
        newEndDate,
        remainingDays: subscription.getRemainingDays(),
        payment
      }
    });
  } catch (error) {
    console.error("Extend subscription error:", error);
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
