// Test vé tháng đơn giản
const mongoose = require("mongoose");
const { checkSubscriptionForParking } = require("./controllers/subscriptionController");

const testSubscription = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/smart-parking");
    
    // Test với biển số đã đăng ký
    console.log("🧪 Testing subscription for: 63-B1 84240");
    const result1 = await checkSubscriptionForParking("688ed22146a26c09a015083a", "63-B1 84240");
    console.log("Exact match:", result1.hasSubscription ? "✅ HAS SUBSCRIPTION" : "❌ NO SUBSCRIPTION");
    
    // Test với OCR reading
    console.log("\\n🧪 Testing subscription for: 63-B1*842.40");
    const result2 = await checkSubscriptionForParking("688ed22146a26c09a015083a", "63-B1*842.40");
    console.log("Fuzzy match:", result2.hasSubscription ? "✅ HAS SUBSCRIPTION" : "❌ NO SUBSCRIPTION");
    
    if (result2.hasSubscription) {
      console.log("Match method:", result2.matchMethod);
      if (result2.matchMethod === 'fuzzy') {
        console.log(`Registered: ${result2.registeredPlate}`);
        console.log(`OCR: ${result2.ocrPlate}`);
      }
    } else {
      console.log("Reason:", result2.reason);
    }
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
};

testSubscription();
