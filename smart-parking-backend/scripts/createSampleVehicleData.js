// Script để tạo dữ liệu mẫu cho việc test vé tháng theo biển số xe
// Chạy script này để thêm xe mẫu với biển số "89-E1*188.96"

const User = require("../models/User");
const Vehicle = require("../models/Vehicle");
const mongoose = require("mongoose");

const createSampleVehicle = async () => {
  try {
    // Kết nối database
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/smart-parking");
    
    // Tìm hoặc tạo user mẫu
    let sampleUser = await User.findOne({ username: "user" });
    
    if (!sampleUser) {
      // Tạo user mới nếu chưa có
      sampleUser = new User({
        username: "user",
        email: "user@example.com", 
        phone: "0123456789",
        password: "$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password: user123
        role: "user",
        balance: 5000000, // 5 triệu VND để test
        isActive: true
      });
      await sampleUser.save();
      console.log("✅ Created sample user");
    }

    // Tạo xe mẫu với biển số đã chỉ định
    const sampleLicensePlate = "89-E1*188.96";
    
    // Kiểm tra xem xe đã tồn tại chưa
    const existingVehicle = await Vehicle.findOne({ 
      licensePlate: sampleLicensePlate.toUpperCase() 
    });

    if (existingVehicle) {
      console.log(`⚠️ Vehicle ${sampleLicensePlate} already exists`);
      return;
    }

    // Tạo xe mới
    const sampleVehicle = new Vehicle({
      licensePlate: sampleLicensePlate.toUpperCase(),
      userId: sampleUser._id,
      vehicleType: "car",
      isRegistered: true,
      registrationDate: new Date(),
      isActive: true
    });

    await sampleVehicle.save();

    // Cập nhật danh sách xe của user
    await User.findByIdAndUpdate(sampleUser._id, {
      $addToSet: { licensePlates: sampleLicensePlate.toUpperCase() }
    });

    console.log("✅ Created sample vehicle successfully!");
    console.log(`📋 User: ${sampleUser.username} (${sampleUser.email})`);
    console.log(`🚗 Vehicle: ${sampleVehicle.licensePlate} (${sampleVehicle.vehicleType})`);
    console.log(`💰 User balance: ${sampleUser.balance.toLocaleString()} VND`);
    console.log("");
    console.log("📝 Test instructions:");
    console.log("1. Login with username: user, password: user123");
    console.log("2. Go to user dashboard");
    console.log("3. Click 'Mua vé tháng' button for the sample vehicle");
    console.log("4. Test subscription creation with the sample license plate");

  } catch (error) {
    console.error("❌ Error creating sample data:", error);
  } finally {
    await mongoose.disconnect();
    console.log("📴 Database disconnected");
  }
};

// Chạy script nếu được gọi trực tiếp
if (require.main === module) {
  createSampleVehicle();
}

module.exports = createSampleVehicle;
