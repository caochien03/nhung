const Payment = require("../models/Payment");
const ParkingRecord = require("../models/ParkingRecord");
const User = require("../models/User");
const crypto = require("crypto");

// Create payment
exports.createPayment = async (req, res) => {
  try {
    const { parkingRecordId, amount, method, notes } = req.body;

    if (!parkingRecordId || !amount || !method) {
      return res.status(400).json({
        success: false,
        message: "Parking record ID, amount, and method are required",
      });
    }

    // Check if parking record exists
    const parkingRecord = await ParkingRecord.findById(parkingRecordId);
    if (!parkingRecord) {
      return res.status(404).json({
        success: false,
        message: "Parking record not found",
      });
    }

    // Check if payment already exists
    const existingPayment = await Payment.findOne({ parkingRecordId });
    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: "Payment already exists for this parking record",
      });
    }

    // Generate QR code if method is QR
    let qrCode = null;
    if (method === "qr") {
      qrCode = generateQRCode(amount, parkingRecordId);
    }

    // Process payment based on method
    let status = "pending";
    if (method === "cash" || method === "balance") {
      status = "completed";
    }

    // If balance payment, check and deduct from user balance
    if (method === "balance" && parkingRecord.userId) {
      const user = await User.findById(parkingRecord.userId);
      if (!user || user.balance < amount) {
        return res.status(400).json({
          success: false,
          message: "Insufficient balance",
        });
      }

      user.balance -= amount;
      await user.save();
    }

    const payment = new Payment({
      parkingRecordId,
      amount,
      method,
      status,
      qrCode,
      transactionId: generateTransactionId(),
      processedBy: req.user?._id,
      notes,
    });

    await payment.save();

    // Update parking record payment status
    parkingRecord.paymentStatus = status;
    parkingRecord.paymentMethod = method;
    await parkingRecord.save();

    res.status(201).json({
      success: true,
      message: "Payment created successfully",
      data: payment,
    });
  } catch (error) {
    console.error("Create payment error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get payment by parking record
exports.getPaymentByRecord = async (req, res) => {
  try {
    const { parkingRecordId } = req.params;

    const payment = await Payment.findOne({ parkingRecordId })
      .populate("processedBy", "username");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error("Get payment error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Generate QR code for payment
exports.generateQR = async (req, res) => {
  try {
    const { amount, parkingRecordId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required",
      });
    }

    const qrCode = generateQRCode(amount, parkingRecordId);

    res.json({
      success: true,
      data: {
        qrCode,
        amount,
        parkingRecordId,
      },
    });
  } catch (error) {
    console.error("Generate QR error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Complete QR payment
exports.completeQRPayment = async (req, res) => {
  try {
    const { parkingRecordId, transactionId } = req.body;

    const payment = await Payment.findOne({ 
      parkingRecordId,
      method: "qr",
      status: "pending"
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Pending QR payment not found",
      });
    }

    payment.status = "completed";
    payment.transactionId = transactionId;
    await payment.save();

    // Update parking record
    const parkingRecord = await ParkingRecord.findById(parkingRecordId);
    if (parkingRecord) {
      parkingRecord.paymentStatus = "paid";
      await parkingRecord.save();
    }

    res.json({
      success: true,
      message: "QR payment completed successfully",
      data: payment,
    });
  } catch (error) {
    console.error("Complete QR payment error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get all payments
exports.getPayments = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      method, 
      startDate, 
      endDate 
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (method) query.method = method;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const payments = await Payment.find(query)
      .populate("parkingRecordId", "licensePlate timeIn timeOut")
      .populate("processedBy", "username")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments(query);

    res.json({
      success: true,
      data: payments,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        totalPayments: total,
      },
    });
  } catch (error) {
    console.error("Get payments error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get payment statistics
exports.getPaymentStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const query = {};
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const [
      totalPayments,
      totalAmount,
      methodStats,
      statusStats,
    ] = await Promise.all([
      Payment.countDocuments(query),
      Payment.aggregate([
        { $match: { ...query, status: "completed" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Payment.aggregate([
        { $match: { ...query, status: "completed" } },
        { $group: { _id: "$method", total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        { $match: query },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        totalPayments,
        totalAmount: totalAmount[0]?.total || 0,
        methodStats,
        statusStats,
      },
    });
  } catch (error) {
    console.error("Get payment stats error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Helper functions
function generateQRCode(amount, parkingRecordId) {
  // Generate a simple QR code data (in real implementation, use a QR library)
  const qrData = {
    amount,
    parkingRecordId,
    timestamp: Date.now(),
    merchant: "Smart Parking",
  };
  
  return `data:image/png;base64,${Buffer.from(JSON.stringify(qrData)).toString("base64")}`;
}

function generateTransactionId() {
  return `TXN${Date.now()}${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
} 