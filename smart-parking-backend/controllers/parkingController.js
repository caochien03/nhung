const ParkingRecord = require("../models/ParkingRecord");
const Vehicle = require("../models/Vehicle");
const User = require("../models/User");
const recognizePlate = require("../utils/recognizePlate_fastapi");
const { uploadBase64Image } = require("../utils/cloudinaryHelper");

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

    // Upload hình ảnh lên Cloudinary nếu có
    let imageData = null;
    if (image) {
      try {
        imageData = await uploadBase64Image(
          image, 
          licensePlate, 
          action, 
          cameraIndex || 1
        );
      } catch (uploadError) {
        console.error('Error uploading image:', uploadError);
        // Tiếp tục xử lý mà không hình ảnh
      }
    }

    // Tạo record mới
    const recordData = {
      rfid,
      licensePlate: licensePlate ? licensePlate.toUpperCase() : null,
      cameraIndex: cameraIndex || 1,
      userId,
      isRegisteredUser,
    };

    // Thêm thời gian và hình ảnh dựa vào action
    if (action === "in") {
      recordData.timeIn = new Date();
      if (imageData) {
        recordData.entryImage = imageData;
      }
    } else if (action === "out") {
      recordData.timeOut = new Date();
      if (imageData) {
        recordData.exitImage = imageData;
      }
      
      // Tìm record vào tương ứng để cập nhật
      const entryRecord = await ParkingRecord.findOne({
        rfid,
        status: 'active',
        timeOut: { $exists: false }
      }).sort({ timeIn: -1 });

      if (entryRecord) {
        // Cập nhật record vào với thông tin ra
        entryRecord.timeOut = new Date();
        entryRecord.status = 'completed';
        if (imageData) {
          entryRecord.exitImage = imageData;
        }
        await entryRecord.save();

        return res.json({
          success: true,
          message: "Vehicle exit recorded",
          data: {
            action: action,
            licensePlate: licensePlate || "Không nhận diện được",
            isRegisteredUser,
            userId,
            recordId: entryRecord._id
          },
        });
      }
    } else {
      recordData.timeIn = new Date();
      if (imageData) {
        recordData.entryImage = imageData;
      }
    }

    const newRecord = new ParkingRecord(recordData);
    await newRecord.save();

    res.json({
      success: true,
      message: "Record created",
      data: {
        action: action,
        licensePlate: licensePlate || "Không nhận diện được",
        isRegisteredUser,
        userId,
        recordId: newRecord._id
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
      status: "active",
      timeOut: { $exists: false } // Đảm bảo chưa có thời gian ra
    })
    .populate("userId", "username email phone")
    .populate("subscriptionId", "type startDate endDate")
    .sort({ timeIn: -1 });

    // Tính toán thông tin bổ sung cho mỗi record
    const enrichedRecords = records.map(record => {
      const recordObj = record.toObject();
      
      // Tính thời gian đỗ hiện tại
      const now = new Date();
      const parkingDurationMs = now.getTime() - record.timeIn.getTime();
      const hours = Math.floor(parkingDurationMs / (1000 * 60 * 60));
      const minutes = Math.floor((parkingDurationMs % (1000 * 60 * 60)) / (1000 * 60));
      
      recordObj.currentDuration = `${hours}h ${minutes}m`;
      recordObj.isRegisteredUser = !!record.userId;
      
      return recordObj;
    });

    res.json({
      success: true,
      data: enrichedRecords,
    });
  } catch (err) {
    console.error("Get active records error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get records cần thanh toán (đã ra nhưng chưa thanh toán)
exports.getPendingPayments = async (req, res) => {
  try {
    const records = await ParkingRecord.find({ 
      status: "completed",
      paymentStatus: "pending",
      timeOut: { $exists: true },
      fee: { $gt: 0 } // Chỉ lấy những record có phí > 0
    })
    .populate("userId", "username email phone")
    .sort({ timeOut: -1 });

    res.json({
      success: true,
      data: records,
    });
  } catch (err) {
    console.error("Get pending payments error:", err);
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

// Lấy lịch sử xe vào/ra với hình ảnh cho staff (trong ngày)
exports.getParkingHistoryWithImages = async (req, res) => {
  try {
    const { date, page = 1, limit = 20, licensePlate, action } = req.query;
    
    // Xử lý ngày - mặc định là hôm nay
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Tạo query
    const query = {
      $or: [
        { timeIn: { $gte: startOfDay, $lte: endOfDay } },
        { timeOut: { $gte: startOfDay, $lte: endOfDay } }
      ]
    };

    // Lọc theo biển số xe nếu có
    if (licensePlate) {
      query.licensePlate = { $regex: licensePlate, $options: "i" };
    }

    // Lọc theo hành động nếu có
    if (action === 'in') {
      query.timeIn = { $gte: startOfDay, $lte: endOfDay };
    } else if (action === 'out') {
      query.timeOut = { $gte: startOfDay, $lte: endOfDay };
    }

    const records = await ParkingRecord.find(query)
      .populate("userId", "username email phone")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await ParkingRecord.countDocuments(query);

    // Xử lý dữ liệu để tách thành xe vào và xe ra
    const processedRecords = [];

    records.forEach(record => {
      // Xe vào
      if (record.timeIn && record.timeIn >= startOfDay && record.timeIn <= endOfDay) {
        processedRecords.push({
          _id: record._id + '_in',
          recordId: record._id,
          rfid: record.rfid,
          licensePlate: record.licensePlate,
          action: 'in',
          timestamp: record.timeIn,
          image: record.entryImage || null,
          cameraIndex: record.cameraIndex,
          userId: record.userId,
          isRegisteredUser: record.isRegisteredUser,
          status: record.status,
          notes: record.notes
        });
      }

      // Xe ra
      if (record.timeOut && record.timeOut >= startOfDay && record.timeOut <= endOfDay) {
        processedRecords.push({
          _id: record._id + '_out',
          recordId: record._id,
          rfid: record.rfid,
          licensePlate: record.licensePlate,
          action: 'out',
          timestamp: record.timeOut,
          image: record.exitImage || null,
          cameraIndex: record.cameraIndex,
          userId: record.userId,
          isRegisteredUser: record.isRegisteredUser,
          status: record.status,
          fee: record.fee,
          feeType: record.feeType,
          duration: record.duration,
          durationFormatted: record.durationFormatted,
          notes: record.notes
        });
      }
    });

    // Sắp xếp lại theo thời gian
    processedRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      success: true,
      data: {
        records: processedRecords,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          totalRecords: total,
        },
        summary: {
          date: targetDate.toISOString().split('T')[0],
          totalEntries: processedRecords.filter(r => r.action === 'in').length,
          totalExits: processedRecords.filter(r => r.action === 'out').length,
        }
      }
    });

  } catch (err) {
    console.error("Get parking history with images error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Lấy lịch sử xe vào/ra trong khoảng thời gian (tối đa 3 ngày)
exports.getParkingHistoryRange = async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 50, licensePlate, action } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp startDate và endDate",
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Kiểm tra không vượt quá 3 ngày
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (diffDays > 3) {
      return res.status(400).json({
        success: false,
        message: "Chỉ có thể xem lịch sử tối đa 3 ngày",
      });
    }

    // Thiết lập thời gian bắt đầu và kết thúc của ngày
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    // Tạo query
    const query = {
      $or: [
        { timeIn: { $gte: start, $lte: end } },
        { timeOut: { $gte: start, $lte: end } }
      ]
    };

    // Lọc theo biển số xe nếu có
    if (licensePlate) {
      query.licensePlate = { $regex: licensePlate, $options: "i" };
    }

    const records = await ParkingRecord.find(query)
      .populate("userId", "username email phone")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await ParkingRecord.countDocuments(query);

    // Xử lý dữ liệu tương tự như function trên
    const processedRecords = [];

    records.forEach(record => {
      // Xe vào
      if (record.timeIn && record.timeIn >= start && record.timeIn <= end) {
        if (!action || action === 'in') {
          processedRecords.push({
            _id: record._id + '_in',
            recordId: record._id,
            rfid: record.rfid,
            licensePlate: record.licensePlate,
            action: 'in',
            timestamp: record.timeIn,
            image: record.entryImage,
            cameraIndex: record.cameraIndex,
            userId: record.userId,
            isRegisteredUser: record.isRegisteredUser,
            status: record.status,
            notes: record.notes
          });
        }
      }

      // Xe ra
      if (record.timeOut && record.timeOut >= start && record.timeOut <= end) {
        if (!action || action === 'out') {
          processedRecords.push({
            _id: record._id + '_out',
            recordId: record._id,
            rfid: record.rfid,
            licensePlate: record.licensePlate,
            action: 'out',
            timestamp: record.timeOut,
            image: record.exitImage,
            cameraIndex: record.cameraIndex,
            userId: record.userId,
            isRegisteredUser: record.isRegisteredUser,
            status: record.status,
            fee: record.fee,
            feeType: record.feeType,
            duration: record.duration,
            durationFormatted: record.durationFormatted,
            notes: record.notes
          });
        }
      }
    });

    // Sắp xếp lại theo thời gian
    processedRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Thống kê theo ngày
    const dailyStats = {};
    processedRecords.forEach(record => {
      const date = new Date(record.timestamp).toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { entries: 0, exits: 0, total: 0 };
      }
      if (record.action === 'in') {
        dailyStats[date].entries++;
      } else {
        dailyStats[date].exits++;
      }
      dailyStats[date].total++;
    });

    res.json({
      success: true,
      data: processedRecords,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        totalRecords: total,
      },
      summary: {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        totalEntries: processedRecords.filter(r => r.action === 'in').length,
        totalExits: processedRecords.filter(r => r.action === 'out').length,
        dailyStats
      }
    });

  } catch (err) {
    console.error("Get parking history range error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Lấy chi tiết record với hình ảnh
exports.getParkingRecordWithImages = async (req, res) => {
  try {
    const { id } = req.params;

    const record = await ParkingRecord.findById(id)
      .populate("userId", "username email phone")
      .populate("subscriptionId", "type startDate endDate");

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bản ghi",
      });
    }

    // Format dữ liệu với hình ảnh
    const formattedRecord = {
      _id: record._id,
      rfid: record.rfid,
      licensePlate: record.licensePlate,
      timeIn: record.timeIn,
      timeOut: record.timeOut,
      fee: record.fee,
      feeType: record.feeType,
      originalFee: record.originalFee,
      subscriptionDiscount: record.subscriptionDiscount,
      duration: record.duration,
      durationFormatted: record.durationFormatted,
      cameraIndex: record.cameraIndex,
      status: record.status,
      paymentStatus: record.paymentStatus,
      paymentMethod: record.paymentMethod,
      paymentType: record.paymentType,
      userId: record.userId,
      subscriptionId: record.subscriptionId,
      isRegisteredUser: record.isRegisteredUser,
      notes: record.notes,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      images: {
        entry: record.entryImage,
        exit: record.exitImage
      }
    };

    res.json({
      success: true,
      data: formattedRecord,
    });

  } catch (err) {
    console.error("Get parking record with images error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
