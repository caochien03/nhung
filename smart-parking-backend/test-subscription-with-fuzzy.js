// Test script để kiểm tra vé tháng với fuzzy matching
// Simulate ESP32 gửi OCR với biển số sai khác

const { checkSubscriptionForParking } = require("./controllers/subscriptionController");
const mongoose = require("mongoose");
const User = require("./models/User");
const Vehicle = require("./models/Vehicle");
const Subscription = require("./models/Subscription");

const testSubscriptionWithFuzzyMatching = async () => {
  try {
    // Kết nối database
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/smart-parking");
    console.log("✅ Connected to database");

    console.log("🧪 Testing Subscription with Fuzzy Matching");
    console.log("=============================================");

    // Tìm subscription đã tạo
    const subscription = await Subscription.findOne({
      licensePlate: "63-B1 84240",
      status: "active",
      paymentStatus: "paid"
    }).populate("userId", "username");

    if (!subscription) {
      console.log("❌ No active subscription found for 63-B1 84240");
      return;
    }

    console.log("📋 Found subscription:");
    console.log(`  - User: ${subscription.userId.username}`);
    console.log(`  - License Plate: ${subscription.licensePlate}`);
    console.log(`  - Type: ${subscription.type}`);
    console.log(`  - Status: ${subscription.status}`);
    console.log(`  - End Date: ${subscription.endDate.toISOString()}`);

    // Test cases với các OCR readings khác nhau
    const testCases = [
      {
        ocrPlate: "63-B1*842.40",
        description: "User's case: OCR with asterisk and dots"
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

    console.log("\\n🚗 Testing OCR scenarios:");
    console.log("---------------------------");

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      
      console.log(`\\nTest ${i + 1}: ${testCase.description}`);
      console.log(`Registered: "${subscription.licensePlate}"`);
      console.log(`OCR Read:   "${testCase.ocrPlate}"`);
      
      const result = await checkSubscriptionForParking(subscription.userId._id, testCase.ocrPlate);
      
      if (result.hasSubscription) {
        console.log("✅ SUBSCRIPTION FOUND!");
        console.log(`   Method: ${result.matchMethod}`);
        
        if (result.matchMethod === 'fuzzy') {
          console.log(`   OCR Plate: ${result.ocrPlate}`);
          console.log(`   Matched: ${result.registeredPlate}`);
          console.log(`   Score: ${result.matchDetails.score.toFixed(3)}`);
        }
      } else {
        console.log("❌ NO SUBSCRIPTION FOUND");
        console.log(`   Reason: ${result.reason}`);
      }
    }

    console.log("\\n📊 Summary:");
    console.log("============");
    console.log("✅ Test 1-4 should PASS (subscription found via fuzzy matching)");
    console.log("❌ Test 5 should FAIL (completely different plate)");
    console.log("\\n🎯 This test proves that OCR reading '63-B1*842.40' should");
    console.log("   successfully find the subscription for '63-B1 84240'!");

    // Simulate ESP32 parking request
    console.log("\\n🚙 Simulating ESP32 Parking Request:");
    console.log("=====================================");

    const simulateESP32Request = async (ocrPlate) => {
      console.log(`\\n📡 ESP32 sends: licensePlate="${ocrPlate}"`);
      
      // Simulate the logic in esp32Controller
      const allVehicles = await Vehicle.find({ isActive: true }).populate("userId");
      let vehicle = allVehicles.find(v => v.licensePlate === ocrPlate.toUpperCase());
      
      if (!vehicle) {
        // Try fuzzy matching
        const { findBestMatch } = require("./utils/licensePlateHelper");
        const registeredPlates = allVehicles.map(v => v.licensePlate);
        const bestMatch = findBestMatch(ocrPlate, registeredPlates, 0.75);
        
        if (bestMatch && bestMatch.isMatch) {
          vehicle = allVehicles.find(v => v.licensePlate === bestMatch.registeredPlate);
          console.log(`🔍 Fuzzy match: "${ocrPlate}" → "${bestMatch.registeredPlate}" (${bestMatch.score.toFixed(3)})`);
        }
      }
      
      if (vehicle) {
        const subscriptionCheck = await checkSubscriptionForParking(vehicle.userId._id, ocrPlate);
        
        if (subscriptionCheck.hasSubscription) {
          console.log("✅ GATE OPENS - Subscription valid!");
          console.log(`   Payment Type: subscription`);
          console.log(`   Fee: FREE (subscription covers parking)`);
        } else {
          console.log("💰 PAY-PER-USE - No valid subscription");
          console.log(`   Payment Type: hourly`);
          console.log(`   Fee: Calculated based on time`);
        }
      } else {
        console.log("❌ VEHICLE NOT FOUND - Registration required");
      }
    };

    await simulateESP32Request("63-B1*842.40");

  } catch (error) {
    console.error("❌ Test error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\\n📴 Disconnected from database");
  }
};

// Chạy test
if (require.main === module) {
  testSubscriptionWithFuzzyMatching();
}

module.exports = testSubscriptionWithFuzzyMatching;
