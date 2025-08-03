const mongoose = require("mongoose");
const User = require("../models/User");
const Vehicle = require("../models/Vehicle");
const Subscription = require("../models/Subscription");
const Payment = require("../models/Payment");
const connectDB = require("../config/db");

const seedSubscriptionData = async () => {
  try {
    await connectDB();
    
    console.log("🌱 Seeding subscription data...");
    
    // Find a test user
    let testUser = await User.findOne({ username: "user" });
    if (!testUser) {
      // Create test user if not exists
      testUser = new User({
        username: "user",
        email: "user@example.com",
        password: "user123",
        role: "user",
        balance: 5000000, // 5 million VND for testing
      });
      await testUser.save();
      console.log("✅ Created test user");
    }

    // Create test vehicle for user
    const existingVehicle = await Vehicle.findOne({ 
      userId: testUser._id,
      licensePlate: "29A12345"
    });

    if (!existingVehicle) {
      const testVehicle = new Vehicle({
        licensePlate: "29A12345",
        userId: testUser._id,
        vehicleType: "car",
        isRegistered: true,
        registrationDate: new Date(),
      });
      await testVehicle.save();
      console.log("✅ Created test vehicle");
    }

    // Check if user already has active subscription
    const existingSubscription = await Subscription.findOne({
      userId: testUser._id,
      status: "active",
      endDate: { $gte: new Date() }
    });

    if (!existingSubscription) {
      // Create test subscription
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription

      // Create payment record
      const payment = new Payment({
        parkingRecordId: null,
        amount: 1500000,
        method: "balance",
        status: "completed",
        transactionId: `SUB${Date.now()}`,
        processedBy: testUser._id,
        notes: "Test subscription payment - monthly",
      });
      await payment.save();

      // Create subscription
      const subscription = new Subscription({
        userId: testUser._id,
        type: "monthly",
        startDate,
        endDate,
        price: 1500000,
        status: "active",
        vehicleLimit: 1,
        paymentStatus: "paid",
        paymentId: payment._id,
      });
      await subscription.save();
      
      console.log("✅ Created test subscription");
      console.log(`   - User: ${testUser.username}`);
      console.log(`   - Type: monthly`);
      console.log(`   - Price: 1,500,000 VND`);
      console.log(`   - Valid until: ${endDate.toLocaleDateString("vi-VN")}`);
    } else {
      console.log("ℹ️  Test user already has active subscription");
    }

    // Create sample expired subscription for history
    const expiredSubscription = await Subscription.findOne({
      userId: testUser._id,
      status: "expired"
    });

    if (!expiredSubscription) {
      const expiredStartDate = new Date();
      expiredStartDate.setMonth(expiredStartDate.getMonth() - 2);
      const expiredEndDate = new Date();
      expiredEndDate.setMonth(expiredEndDate.getMonth() - 1);

      const expiredPayment = new Payment({
        parkingRecordId: null,
        amount: 1500000,
        method: "qr",
        status: "completed",
        transactionId: `SUB${Date.now() - 1000000}`,
        processedBy: testUser._id,
        notes: "Previous subscription payment - monthly",
      });
      await expiredPayment.save();

      const expiredSub = new Subscription({
        userId: testUser._id,
        type: "monthly",
        startDate: expiredStartDate,
        endDate: expiredEndDate,
        price: 1500000,
        status: "expired",
        vehicleLimit: 1,
        paymentStatus: "paid",
        paymentId: expiredPayment._id,
      });
      await expiredSub.save();
      
      console.log("✅ Created expired subscription for history");
    }

    console.log("🎉 Subscription seed data created successfully!");
    
    // Display summary
    const activeSubscriptions = await Subscription.countDocuments({ status: "active" });
    const totalSubscriptions = await Subscription.countDocuments();
    
    console.log("\n📊 Summary:");
    console.log(`   - Total subscriptions: ${totalSubscriptions}`);
    console.log(`   - Active subscriptions: ${activeSubscriptions}`);
    console.log(`   - Test user balance: ${testUser.balance.toLocaleString()} VND`);
    
  } catch (error) {
    console.error("❌ Error seeding subscription data:", error);
  } finally {
    process.exit(0);
  }
};

// Run the seed function
if (require.main === module) {
  seedSubscriptionData();
}

module.exports = seedSubscriptionData;
