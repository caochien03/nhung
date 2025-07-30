const ParkingRecord = require("../models/ParkingRecord");
const Vehicle = require("../models/Vehicle");
const User = require("../models/User");
const recognizePlate = require("../utils/recognizePlate_fastapi");

// Create parking record
exports.createParkingRecord = async (req, res) => {
  try {
    let { rfid, image, licensePlate, action, cameraIndex } = req.body;

    // If only image (capture for recognition), don't save to DB
    if (image && !action) {
      licensePlate = await recognizePlate(image);
      return res.json({
        success: true,
        message: "Plate recognized",
        data: {
          licensePlate: licensePlate || "Không nhận diện được",
        },
      });
    }

    // If no license plate and has image, recognize it
    if (!licensePlate && image) {
      licensePlate = await recognizePlate(image);
    }

    // Check if vehicle is registered
    let userId = null;
    let isRegisteredUser = false;
    
    if (licensePlate) {
      const vehicle = await Vehicle.findOne({ 
        licensePlate: licensePlate.toUpperCase(),
        isActive: true 
      });
      
      if (vehicle) {
        userId = vehicle.userId;
        isRegisteredUser = true;
      }
    }

    const newRecord = new ParkingRecord({
      rfid,
      licensePlate: licensePlate ? licensePlate.toUpperCase() : null,
      timeIn: action === "in" ? new Date() : undefined,
      timeOut: action === "out" ? new Date() : undefined,
      cameraIndex: cameraIndex || 1,
      userId,
      isRegisteredUser,
    });

    await newRecord.save();

    res.json({
      success: true,
      message: "Record created",
      data: {
        action: action,
        licensePlate: licensePlate || "Không nhận diện được",
        isRegisteredUser,
        userId,
      },
    });
  } catch (err) {
    console.error("Create parking record error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get all parking records
exports.getParkingRecords = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      licensePlate, 
      startDate, 
      endDate,
      userId 
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (licensePlate) {
      query.licensePlate = { $regex: licensePlate, $options: "i" };
    }
    if (userId) query.userId = userId;
    
    if (startDate || endDate) {
      query.timeIn = {};
      if (startDate) query.timeIn.$gte = new Date(startDate);
      if (endDate) query.timeIn.$lte = new Date(endDate);
    }

    const records = await ParkingRecord.find(query)
      .populate("userId", "username email")
      .sort({ timeIn: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await ParkingRecord.countDocuments(query);

    res.json({
      success: true,
      data: records,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        totalRecords: total,
      },
    });
  } catch (err) {
    console.error("Get parking records error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get active parking records
exports.getActiveRecords = async (req, res) => {
  try {
    const records = await ParkingRecord.find({ 
      status: "active" 
    })
    .populate("userId", "username email")
    .sort({ timeIn: -1 });

    res.json({
      success: true,
      data: records,
    });
  } catch (err) {
    console.error("Get active records error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Complete parking record (vehicle exit)
exports.completeRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { timeOut, fee, paymentMethod = "cash" } = req.body;

    const record = await ParkingRecord.findById(id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Parking record not found",
      });
    }

    if (record.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Record already completed",
      });
    }

    record.timeOut = timeOut || new Date();
    record.fee = fee || 0;
    record.status = "completed";
    record.paymentStatus = "paid";
    record.paymentMethod = paymentMethod;

    await record.save();

    res.json({
      success: true,
      message: "Record completed successfully",
      data: record,
    });
  } catch (err) {
    console.error("Complete record error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get parking record by ID
exports.getParkingRecordById = async (req, res) => {
  try {
    const record = await ParkingRecord.findById(req.params.id)
      .populate("userId", "username email");

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Parking record not found",
      });
    }

    res.json({
      success: true,
      data: record,
    });
  } catch (err) {
    console.error("Get parking record error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get user parking history
exports.getUserParkingHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const records = await ParkingRecord.find({ userId })
      .sort({ timeIn: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await ParkingRecord.countDocuments({ userId });

    res.json({
      success: true,
      data: records,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        totalRecords: total,
      },
    });
  } catch (err) {
    console.error("Get user parking history error:", err);
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
      totalRevenue,
      registeredUsers,
      walkInUsers,
    ] = await Promise.all([
      ParkingRecord.countDocuments(query),
      ParkingRecord.countDocuments({ ...query, status: "active" }),
      ParkingRecord.countDocuments({ ...query, status: "completed" }),
      ParkingRecord.aggregate([
        { $match: { ...query, status: "completed" } },
        { $group: { _id: null, total: { $sum: "$fee" } } },
      ]),
      ParkingRecord.countDocuments({ ...query, isRegisteredUser: true }),
      ParkingRecord.countDocuments({ ...query, isRegisteredUser: false }),
    ]);

    res.json({
      success: true,
      data: {
        totalRecords,
        activeRecords,
        completedRecords,
        totalRevenue: totalRevenue[0]?.total || 0,
        registeredUsers,
        walkInUsers,
      },
    });
  } catch (err) {
    console.error("Get parking stats error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
