// Script tạo subscription cho việc test
const mongoose = require("mongoose");
const User = require("../models/User");
const Vehicle = require("../models/Vehicle");
const Subscription = require("../models/Subscription");

const createTestSubscription = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/smart-parking");
    console.log("✅ Connected to database");

    // Tìm user test
    const user = await User.findOne({ username: "user" });
    if (!user) {
      console.log("❌ User 'user' not found");
      return;
    }

    // Tạo subscription cho biển số test
    const testPlate = "63-B1 84240";
    
    // Xóa subscription cũ nếu có
    await Subscription.deleteMany({ licensePlate: testPlate.toUpperCase() });
    
    // Kiểm tra xe có tồn tại không
    let vehicle = await Vehicle.findOne({ licensePlate: testPlate.toUpperCase() });
    
    if (!vehicle) {
      // Tạo xe mới
      vehicle = new Vehicle({
        licensePlate: testPlate.toUpperCase(),
        userId: user._id,
        vehicleType: "car",
        isRegistered: true,
        registrationDate: new Date(),
        isActive: true
      });
      await vehicle.save();
      
      // Cập nhật user
      await User.findByIdAndUpdate(user._id, {
        $addToSet: { licensePlates: testPlate.toUpperCase() }
      });
      
      console.log(`✅ Created vehicle: ${testPlate.toUpperCase()}`);
    }

    // Tạo subscription mới
    const subscription = new Subscription({
      userId: user._id,
      licensePlate: testPlate.toUpperCase(),
      type: "monthly",
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 ngày
      price: 1500000,
      status: "active",
      paymentStatus: "paid",
      vehicleLimit: 1,
      autoRenew: false,
      usageCount: 0,
      renewalNotified: false
    });

    await subscription.save();

    console.log("✅ Created subscription:");
    console.log(`  - User: ${user.username}`);
    console.log(`  - License Plate: ${subscription.licensePlate}`);
    console.log(`  - Type: ${subscription.type}`);
    console.log(`  - Status: ${subscription.status}`);
    console.log(`  - End Date: ${subscription.endDate.toISOString()}`);
    console.log(`  - Price: ${subscription.price.toLocaleString()} VND`);

    console.log("\\n🧪 Ready to test fuzzy matching!");
    console.log("Test with OCR reading: 63-B1*842.40");

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("📴 Disconnected from database");
  }
};

if (require.main === module) {
  createTestSubscription();
}

module.exports = createTestSubscription;
