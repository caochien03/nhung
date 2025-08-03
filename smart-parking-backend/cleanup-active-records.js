// Cleanup active parking records
const mongoose = require('mongoose');
const ParkingRecord = require('./models/ParkingRecord');

const cleanup = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-parking');
    console.log('✅ Connected to database');

    // Tìm tất cả records active (chưa có timeOut)
    const activeRecords = await ParkingRecord.find({
      timeOut: { $exists: false }
    });

    console.log(`🔍 Found ${activeRecords.length} active parking records:`);
    
    activeRecords.forEach(record => {
      console.log(`- RFID: ${record.rfid}, Plate: ${record.licensePlate}, Status: ${record.status}`);
    });

    if (activeRecords.length > 0) {
      console.log('\n🧹 Marking all active records as completed...');
      
      await ParkingRecord.updateMany(
        { timeOut: { $exists: false } },
        { 
          timeOut: new Date(),
          status: 'completed',
          fee: 0,
          feeType: 'cleanup',
          paymentStatus: 'paid'
        }
      );
      
      console.log('✅ Cleanup completed');
    } else {
      console.log('✅ No active records to cleanup');
    }

  } catch (error) {
    console.error('❌ Cleanup error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📴 Disconnected from database');
  }
};

cleanup();
