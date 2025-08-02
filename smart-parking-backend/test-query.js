const mongoose = require('mongoose');
const ParkingRecord = require('./models/ParkingRecord');

async function testQuery() {
  try {
    await mongoose.connect('mongodb://localhost:27017/smart_parking');
    
    const targetDate = new Date('2025-08-02');
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const query = {
      $or: [
        { timeIn: { $gte: startOfDay, $lte: endOfDay } },
        { timeOut: { $gte: startOfDay, $lte: endOfDay } }
      ]
    };

    console.log('📊 Query range:');
    console.log('   startOfDay:', startOfDay);
    console.log('   endOfDay:', endOfDay);
    
    const records = await ParkingRecord.find(query).sort({ createdAt: -1 });
    
    console.log('📊 Found', records.length, 'records:');
    records.forEach(r => {
      console.log(`   ${r._id}: ${r.licensePlate}`);
      console.log(`      timeIn: ${r.timeIn}`);
      console.log(`      timeOut: ${r.timeOut}`);
      console.log(`      entryImage: ${!!r.entryImage?.url}`);
      console.log('');
    });
    
    await mongoose.disconnect();
  } catch(err) {
    console.error('❌ Error:', err.message);
  }
}

testQuery();
