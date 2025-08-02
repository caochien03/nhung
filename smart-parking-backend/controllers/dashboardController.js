const ParkingRecord = require("../models/ParkingRecord");
const Payment = require("../models/Payment");
const User = require("../models/User");
const Vehicle = require("../models/Vehicle");

// Get dashboard statistics
exports.getStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // **THÊM CAPACITY THÔNG TIN**
    const MAX_PARKING_CAPACITY = 4; // Giới hạn 4 vị trí

    const [
      totalRevenue,
      todayRevenue,
      activeParkings,
      totalVehicles,
      registeredUsers,
      walkInUsers,
      todayParkings,
    ] = await Promise.all([
      // Total revenue từ ParkingRecord với fee
      ParkingRecord.aggregate([
        { $match: { status: "completed", fee: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: "$fee" } } },
      ]),
      
      // Today's revenue từ ParkingRecord
      ParkingRecord.aggregate([
        { 
          $match: { 
            status: "completed",
            fee: { $gt: 0 },
            timeOut: { $gte: today, $lt: tomorrow }
          } 
        },
        { $group: { _id: null, total: { $sum: "$fee" } } },
      ]),
      
      // Active parkings (xe đang đỗ)
      ParkingRecord.countDocuments({ 
        status: "active",
        timeOut: { $exists: false }
      }),
      
      // Total vehicles đã đăng ký
      Vehicle.countDocuments({ isActive: true }),
      
      // Registered users
      User.countDocuments({ role: "user", isActive: true }),
      
      // Walk-in users hôm nay (parking records không có userId)
      ParkingRecord.countDocuments({ 
        userId: { $exists: false },
        timeIn: { $gte: today, $lt: tomorrow }
      }),
      
      // Tổng số xe vào hôm nay
      ParkingRecord.countDocuments({
        timeIn: { $gte: today, $lt: tomorrow }
      }),
    ]);

    // **TÍNH TOÁN CAPACITY THÔNG TIN**
    const occupancyRate = (activeParkings / MAX_PARKING_CAPACITY) * 100;
    const availableSpots = MAX_PARKING_CAPACITY - activeParkings;
    const isFullCapacity = activeParkings >= MAX_PARKING_CAPACITY;

    res.json({
      success: true,
      data: {
        totalRevenue: totalRevenue[0]?.total || 0,
        todayRevenue: todayRevenue[0]?.total || 0,
        activeParkings,
        totalVehicles: todayParkings, // Số xe vào hôm nay thay vì tổng xe đăng ký
        registeredUsers,
        walkInUsers,
        // **THÊM CAPACITY THÔNG TIN**
        parkingCapacity: {
          current: activeParkings,
          maximum: MAX_PARKING_CAPACITY,
          available: availableSpots,
          occupancyRate: Math.round(occupancyRate),
          isFull: isFullCapacity,
          status: isFullCapacity ? "FULL" : availableSpots <= 1 ? "ALMOST_FULL" : "AVAILABLE"
        }
      },
    });
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get revenue data
exports.getRevenue = async (req, res) => {
  try {
    const { period = "week" } = req.query;
    
    let startDate, endDate;
    const now = new Date();
    
    switch (period) {
      case "day":
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "week":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        endDate = new Date(now);
        break;
      case "month":
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        endDate = new Date(now);
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        endDate = new Date(now);
    }

    const revenueData = await Payment.aggregate([
      {
        $match: {
          status: "completed",
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          totalRevenue: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: revenueData,
    });
  } catch (error) {
    console.error("Get revenue error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get today's revenue breakdown
exports.getTodayRevenue = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalRevenue,
      methodBreakdown,
      hourlyBreakdown,
    ] = await Promise.all([
      // Total revenue today
      Payment.aggregate([
        { 
          $match: { 
            status: "completed",
            createdAt: { $gte: today, $lt: tomorrow }
          } 
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      
      // Revenue by payment method
      Payment.aggregate([
        { 
          $match: { 
            status: "completed",
            createdAt: { $gte: today, $lt: tomorrow }
          } 
        },
        {
          $group: {
            _id: "$method",
            total: { $sum: "$amount" },
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Revenue by hour
      Payment.aggregate([
        { 
          $match: { 
            status: "completed",
            createdAt: { $gte: today, $lt: tomorrow }
          } 
        },
        {
          $group: {
            _id: { $hour: "$createdAt" },
            total: { $sum: "$amount" },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
    ]);

    res.json({
      success: true,
      data: {
        total: totalRevenue[0]?.total || 0,
        breakdown: {
          method: methodBreakdown,
          hourly: hourlyBreakdown,
        },
      },
    });
  } catch (error) {
    console.error("Get today revenue error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get parking statistics
exports.getParkingStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const query = {};
    if (startDate || endDate) {
      query.timeIn = {};
      if (startDate) query.timeIn.$gte = new Date(startDate);
      if (endDate) query.timeIn.$lte = new Date(endDate);
    }

    const [
      totalRecords,
      activeRecords,
      completedRecords,
      averageDuration,
      vehicleTypeStats,
    ] = await Promise.all([
      ParkingRecord.countDocuments(query),
      ParkingRecord.countDocuments({ ...query, status: "active" }),
      ParkingRecord.countDocuments({ ...query, status: "completed" }),
      ParkingRecord.aggregate([
        { $match: { ...query, status: "completed", timeOut: { $exists: true } } },
        {
          $group: {
            _id: null,
            avgDuration: { $avg: { $subtract: ["$timeOut", "$timeIn"] } }
          }
        }
      ]),
      ParkingRecord.aggregate([
        { $match: { ...query, status: "completed" } },
        {
          $lookup: {
            from: "vehicles",
            localField: "licensePlate",
            foreignField: "licensePlate",
            as: "vehicle"
          }
        },
        {
          $group: {
            _id: { $ifNull: [{ $arrayElemAt: ["$vehicle.vehicleType", 0] }, "unknown"] },
            count: { $sum: 1 }
          }
        }
      ]),
    ]);

    res.json({
      success: true,
      data: {
        totalRecords,
        activeRecords,
        completedRecords,
        averageDuration: averageDuration[0]?.avgDuration || 0,
        vehicleTypeStats,
      },
    });
  } catch (error) {
    console.error("Get parking stats error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get system status
exports.getSystemStatus = async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalVehicles,
      activeParkings,
      todayRevenue,
      systemHealth,
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ 
        isActive: true,
        lastLogin: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }),
      Vehicle.countDocuments({ isActive: true }),
      ParkingRecord.countDocuments({ status: "active" }),
      Payment.aggregate([
        { 
          $match: { 
            status: "completed",
            createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
          } 
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      // Mock system health check
      Promise.resolve({
        database: "healthy",
        ocr: "healthy",
        websocket: "healthy",
        cameras: "healthy",
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        totalVehicles,
        activeParkings,
        todayRevenue: todayRevenue[0]?.total || 0,
        systemHealth,
      },
    });
  } catch (error) {
    console.error("Get system status error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}; 