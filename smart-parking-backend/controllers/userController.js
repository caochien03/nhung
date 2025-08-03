const User = require("../models/User");
const Vehicle = require("../models/Vehicle");
const ParkingRecord = require("../models/ParkingRecord");
const Payment = require("../models/Payment");

// Get all users (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    
    const query = {};
    
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(query)
      .select("-password")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: users,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        totalUsers: total,
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Create new user (admin only)
exports.createUser = async (req, res) => {
  try {
    const { username, email, password, phone, role, balance = 0 } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Username, email, and password are required",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Username or email already exists",
      });
    }

    const user = new User({
      username,
      email,
      password,
      phone,
      role: role || "user",
      balance,
    });

    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      data: userResponse,
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Update user (admin only)
exports.updateUser = async (req, res) => {
  try {
    const { email, phone, role, balance, isActive } = req.body;
    
    const updates = {};
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (role !== undefined) updates.role = role;
    if (balance !== undefined) updates.balance = balance;
    if (isActive !== undefined) updates.isActive = isActive;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Delete user (admin only)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Also delete associated vehicles
    await Vehicle.deleteMany({ userId: req.params.id });

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get user's vehicles
exports.getUserVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ 
      userId: req.user._id,
      isActive: true 
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: vehicles,
    });
  } catch (error) {
    console.error("Get user vehicles error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Register new vehicle
exports.registerVehicle = async (req, res) => {
  try {
    const { licensePlate, vehicleType } = req.body;

    if (!licensePlate || !vehicleType) {
      return res.status(400).json({
        success: false,
        message: "License plate and vehicle type are required",
      });
    }

    // Check if vehicle already exists
    const existingVehicle = await Vehicle.findOne({ 
      licensePlate: licensePlate.toUpperCase(),
      isActive: true 
    });

    if (existingVehicle) {
      return res.status(400).json({
        success: false,
        message: "Vehicle with this license plate already exists",
      });
    }

    // Create new vehicle
    const vehicle = new Vehicle({
      licensePlate: licensePlate.toUpperCase(),
      userId: req.user._id,
      vehicleType,
      isRegistered: true,
      registrationDate: new Date(),
    });

    await vehicle.save();

    // Update user's license plates array
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { licensePlates: licensePlate.toUpperCase() }
    });

    res.status(201).json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    console.error("Register vehicle error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Remove vehicle
exports.removeVehicle = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const vehicle = await Vehicle.findOne({
      _id: vehicleId,
      userId: req.user._id,
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    // Check if vehicle has active parking
    const activeParking = await ParkingRecord.findOne({
      licensePlate: vehicle.licensePlate,
      status: "active",
    });

    if (activeParking) {
      return res.status(400).json({
        success: false,
        message: "Cannot remove vehicle with active parking",
      });
    }

    // Soft delete vehicle
    vehicle.isActive = false;
    await vehicle.save();

    // Remove from user's license plates array
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { licensePlates: vehicle.licensePlate }
    });

    res.json({
      success: true,
      message: "Vehicle removed successfully",
    });
  } catch (error) {
    console.error("Remove vehicle error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get user's parking history
exports.getUserParkingHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const query = { userId: req.user._id };
    if (status) query.status = status;

    const records = await ParkingRecord.find(query)
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
  } catch (error) {
    console.error("Get user parking history error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get user's active parking
exports.getUserActiveParking = async (req, res) => {
  try {
    const activeParking = await ParkingRecord.findOne({
      userId: req.user._id,
      status: "active",
    });

    res.json({
      success: true,
      data: activeParking,
    });
  } catch (error) {
    console.error("Get user active parking error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get user's payment history
exports.getUserPaymentHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    // Get user's parking records
    const userParkingRecords = await ParkingRecord.find({ 
      userId: req.user._id 
    }).select('_id');

    const parkingRecordIds = userParkingRecords.map(record => record._id);

    const payments = await Payment.find({
      parkingRecordId: { $in: parkingRecordIds }
    })
    .populate('parkingRecordId', 'licensePlate timeIn timeOut fee')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const total = await Payment.countDocuments({
      parkingRecordId: { $in: parkingRecordIds }
    });

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
    console.error("Get user payment history error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get user dashboard stats
exports.getUserDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const [
      totalVehicles,
      activeParking,
      totalParkingRecords,
      totalSpent,
      thisMonthSpent,
    ] = await Promise.all([
      Vehicle.countDocuments({ userId, isActive: true }),
      ParkingRecord.findOne({ userId, status: "active" }),
      ParkingRecord.countDocuments({ userId }),
      Payment.aggregate([
        {
          $lookup: {
            from: "parkingrecords",
            localField: "parkingRecordId",
            foreignField: "_id",
            as: "parkingRecord"
          }
        },
        {
          $match: {
            "parkingRecord.userId": userId,
            status: "completed"
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" }
          }
        }
      ]),
      Payment.aggregate([
        {
          $lookup: {
            from: "parkingrecords",
            localField: "parkingRecordId",
            foreignField: "_id",
            as: "parkingRecord"
          }
        },
        {
          $match: {
            "parkingRecord.userId": userId,
            status: "completed",
            createdAt: {
              $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" }
          }
        }
      ]),
    ]);

    res.json({
      success: true,
      data: {
        totalVehicles,
        hasActiveParking: !!activeParking,
        activeParking,
        totalParkingRecords,
        totalSpent: totalSpent[0]?.total || 0,
        thisMonthSpent: thisMonthSpent[0]?.total || 0,
      },
    });
  } catch (error) {
    console.error("Get user dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Update user balance
exports.updateUserBalance = async (req, res) => {
  try {
    const { amount, operation = "add" } = req.body; // operation: "add" or "subtract"
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required",
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (operation === "subtract" && user.balance < amount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance",
      });
    }

    user.balance = operation === "add" 
      ? user.balance + amount 
      : user.balance - amount;
    
    await user.save();

    res.json({
      success: true,
      data: {
        balance: user.balance,
        operation,
        amount,
      },
    });
  } catch (error) {
    console.error("Update balance error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}; 