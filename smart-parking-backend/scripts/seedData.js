const mongoose = require("mongoose");
const User = require("../models/User");
const Vehicle = require("../models/Vehicle");
const ParkingRecord = require("../models/ParkingRecord");
const Payment = require("../models/Payment");

// Connect to MongoDB
mongoose.connect("mongodb+srv://nguyencaochien03:chien2003@cluster0.lsol1da.mongodb.net/parking");

const seedData = async () => {
  try {
    console.log("🌱 Starting to seed data...");

    // Clear existing data
    await User.deleteMany({});
    await Vehicle.deleteMany({});
    await ParkingRecord.deleteMany({});
    await Payment.deleteMany({});

    console.log("🗑️ Cleared existing data");

    // Create admin user
    const admin = new User({
      username: "admin",
      email: "admin@smartparking.com",
      password: "admin123",
      phone: "0123456789",
      role: "admin",
      balance: 0,
    });
    await admin.save();
    console.log("✅ Created admin user");

    // Create staff user
    const staff = new User({
      username: "staff",
      email: "staff@smartparking.com",
      password: "staff123",
      phone: "0987654321",
      role: "staff",
      balance: 0,
    });
    await staff.save();
    console.log("✅ Created staff user");

    // Create regular user
    const user = new User({
      username: "user",
      email: "user@smartparking.com",
      password: "user123",
      phone: "0555666777",
      role: "user",
      balance: 500000,
    });
    await user.save();
    console.log("✅ Created regular user");

    // Create vehicles for user
    const vehicle1 = new Vehicle({
      licensePlate: "30A-12345",
      userId: user._id,
      vehicleType: "car",
      isRegistered: true,
    });
    await vehicle1.save();

    const vehicle2 = new Vehicle({
      licensePlate: "30B-67890",
      userId: user._id,
      vehicleType: "car",
      isRegistered: true,
    });
    await vehicle2.save();
    console.log("✅ Created vehicles");

    // Create sample parking records
    const parkingRecord1 = new ParkingRecord({
      rfid: "RFID001",
      licensePlate: "30A-12345",
      timeIn: new Date("2024-03-15T08:30:00"),
      timeOut: new Date("2024-03-15T17:45:00"),
      fee: 95000,
      cameraIndex: 1,
      status: "completed",
      paymentStatus: "paid",
      paymentMethod: "balance",
      userId: user._id,
      isRegisteredUser: true,
    });
    await parkingRecord1.save();

    const parkingRecord2 = new ParkingRecord({
      rfid: "RFID002",
      licensePlate: "30B-67890",
      timeIn: new Date("2024-03-14T09:15:00"),
      timeOut: new Date("2024-03-14T18:30:00"),
      fee: 105000,
      cameraIndex: 1,
      status: "completed",
      paymentStatus: "paid",
      paymentMethod: "qr",
      userId: user._id,
      isRegisteredUser: true,
    });
    await parkingRecord2.save();

    const parkingRecord3 = new ParkingRecord({
      rfid: "RFID003",
      licensePlate: "30A-12345",
      timeIn: new Date("2024-03-16T10:00:00"),
      cameraIndex: 1,
      status: "active",
      paymentStatus: "pending",
      userId: user._id,
      isRegisteredUser: true,
    });
    await parkingRecord3.save();

    const parkingRecord4 = new ParkingRecord({
      rfid: "RFID004",
      licensePlate: "30C-11111",
      timeIn: new Date("2024-03-16T11:30:00"),
      cameraIndex: 1,
      status: "active",
      paymentStatus: "pending",
      isRegisteredUser: false,
    });
    await parkingRecord4.save();
    console.log("✅ Created parking records");

    // Create sample payments
    const payment1 = new Payment({
      parkingRecordId: parkingRecord1._id,
      amount: 95000,
      method: "balance",
      status: "completed",
      transactionId: "TXN001",
      processedBy: staff._id,
    });
    await payment1.save();

    const payment2 = new Payment({
      parkingRecordId: parkingRecord2._id,
      amount: 105000,
      method: "qr",
      status: "completed",
      transactionId: "TXN002",
      processedBy: staff._id,
    });
    await payment2.save();
    console.log("✅ Created payments");

    console.log("🎉 Data seeding completed successfully!");
    console.log("\n📋 Sample Data Created:");
    console.log("- Admin: admin / admin123");
    console.log("- Staff: staff / staff123");
    console.log("- User: user / user123");
    console.log("- Vehicles: 30A-12345, 30B-67890");
    console.log("- Parking Records: 4 records (2 completed, 2 active)");
    console.log("- Payments: 2 completed payments");

  } catch (error) {
    console.error("❌ Error seeding data:", error);
  } finally {
    mongoose.connection.close();
    console.log("🔌 Database connection closed");
  }
};

// Run the seed function
seedData(); 