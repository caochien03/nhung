const User = require("../models/User");
const Vehicle = require("../models/Vehicle");

// Get all users (admin only)
exports.getUsers = async (req, res) => {
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

// Get user vehicles
exports.getUserVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ 
      userId: req.params.userId,
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

// Register vehicle for user
exports.registerVehicle = async (req, res) => {
  try {
    const { licensePlate, vehicleType = "car" } = req.body;
    const userId = req.params.userId;

    if (!licensePlate) {
      return res.status(400).json({
        success: false,
        message: "License plate is required",
      });
    }

    // Check if vehicle already exists
    const existingVehicle = await Vehicle.findOne({ licensePlate });
    if (existingVehicle) {
      return res.status(400).json({
        success: false,
        message: "Vehicle with this license plate already exists",
      });
    }

    const vehicle = new Vehicle({
      licensePlate: licensePlate.toUpperCase(),
      userId,
      vehicleType,
    });

    await vehicle.save();

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

// Update user balance
exports.updateBalance = async (req, res) => {
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