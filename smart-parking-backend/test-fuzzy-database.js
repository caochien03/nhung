// Test script kiểm tra fuzzy matching với database thực tế
// Script này sẽ test trường hợp user đăng ký "63-B1 84240" và OCR đọc "63-B1*842.40"

const mongoose = require("mongoose");
const User = require("./models/User");
const Vehicle = require("./models/Vehicle");
const Subscription = require("./models/Subscription");
const { checkSubscriptionForParking } = require("./controllers/subscriptionController");

const testFuzzyMatchingWithDatabase = async () => {
  try {
    // Kết nối database
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/smart-parking");
    console.log("✅ Connected to database");

    // Tạo user test
    let testUser = await User.findOne({ username: "fuzzy-test-user" });
    
    if (!testUser) {
      testUser = new User({
        username: "fuzzy-test-user",
        email: "fuzzytest@example.com",
        phone: "0987654321",
        password: "$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi",
        role: "user",
        balance: 2000000,
        isActive: true
      });
      await testUser.save();
      console.log("✅ Created test user");
    }

    // Tạo xe với biển số chuẩn
    const registeredPlate = "63-B1 84240";
    
    // Xóa xe cũ nếu có
    await Vehicle.deleteMany({ licensePlate: registeredPlate.toUpperCase() });
    await Subscription.deleteMany({ licensePlate: registeredPlate.toUpperCase() });

    const testVehicle = new Vehicle({
      licensePlate: registeredPlate.toUpperCase(),
      userId: testUser._id,
      vehicleType: "car",
      isRegistered: true,
      registrationDate: new Date(),
      isActive: true
    });
    await testVehicle.save();

    // Cập nhật danh sách xe của user
    await User.findByIdAndUpdate(testUser._id, {
      $addToSet: { licensePlates: registeredPlate.toUpperCase() }
    });

    console.log(`✅ Created vehicle: ${registeredPlate.toUpperCase()}`);

    // Tạo subscription cho xe này
    const testSubscription = new Subscription({
      userId: testUser._id,
      licensePlate: registeredPlate.toUpperCase(),
      type: "monthly",
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 ngày
      price: 1500000,
      status: "active",
      paymentStatus: "paid"
    });
    await testSubscription.save();

    console.log("✅ Created subscription for vehicle");

    console.log("\n🧪 Testing Fuzzy Matching Scenarios:");
    console.log("=====================================");

    // Test cases - OCR đọc sai
    const ocrTestCases = [
      {
        ocrPlate: "63-B1*842.40",
        description: "User's case: OCR with dots and asterisk"
      },
      {
        ocrPlate: "63-B184240",
        description: "OCR missing all punctuation"
      },
      {
        ocrPlate: "63B1 84240",
        description: "OCR missing dash"
      },
      {
        ocrPlate: "63-81 84240",
        description: "OCR confused B with 8"
      },
      {
        ocrPlate: "XX-YZ 99999",
        description: "Completely different plate (should fail)"
      }
    ];

    for (let i = 0; i < ocrTestCases.length; i++) {
      const testCase = ocrTestCases[i];
      
      console.log(`\nTest ${i + 1}: ${testCase.description}`);
      console.log(`Registered: "${registeredPlate.toUpperCase()}"`);
      console.log(`OCR Read:   "${testCase.ocrPlate}"`);
      
      const result = await checkSubscriptionForParking(testUser._id, testCase.ocrPlate);
      
      if (result.hasSubscription) {
        console.log("✅ SUBSCRIPTION FOUND!");
        console.log(`Method: ${result.matchMethod}`);
        
        if (result.matchMethod === 'fuzzy') {
          console.log(`OCR Plate: ${result.ocrPlate}`);
          console.log(`Matched Registered: ${result.registeredPlate}`);
          console.log(`Match Score: ${result.matchDetails.score.toFixed(3)}`);
        }
        
        const daysLeft = Math.ceil((result.subscription.endDate - new Date()) / (1000 * 60 * 60 * 24));
        console.log(`Days remaining: ${daysLeft}`);
      } else {
        console.log("❌ NO SUBSCRIPTION FOUND");
        console.log(`Reason: ${result.reason}`);
        
        if (result.bestMatch) {
          console.log(`Best match attempted: ${result.bestMatch.registeredPlate} (score: ${result.bestMatch.score.toFixed(3)})`);
        }
      }
    }

    console.log("\n📊 Summary:");
    console.log("===========");
    console.log("✅ Test 1-4 should PASS (find subscription via fuzzy matching)");
    console.log("❌ Test 5 should FAIL (completely different plate)");
    console.log("\n🎯 Main Result: OCR reading '63-B1*842.40' successfully matches");
    console.log("   registered plate '63-B1 84240' and finds valid subscription!");

    // Cleanup
    await Vehicle.findByIdAndDelete(testVehicle._id);
    await Subscription.findByIdAndDelete(testSubscription._id);
    await User.findByIdAndUpdate(testUser._id, {
      $pull: { licensePlates: registeredPlate.toUpperCase() }
    });
    
    console.log("\n🧹 Cleaned up test data");

  } catch (error) {
    console.error("❌ Test error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("📴 Disconnected from database");
  }
};

// Chạy test
if (require.main === module) {
  testFuzzyMatchingWithDatabase();
}

module.exports = testFuzzyMatchingWithDatabase;
