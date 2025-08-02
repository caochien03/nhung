const mongoose = require('mongoose');
const ParkingRecord = require('./models/ParkingRecord');

async function testAPIQuery() {
  try {
    await mongoose.connect('mongodb://localhost:27017/smart_parking');
    
    // Exact same logic as API
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
    
    // Exact same query as API
    const records = await ParkingRecord.find(query)
      .populate("userId", "username email phone")
      .sort({ createdAt: -1 })
      .limit(50)
      .skip(0);
    
    console.log('📊 Found', records.length, 'records (with API settings):');
    records.forEach(r => {
      console.log(`   ${r._id}: ${r.licensePlate}`);
      console.log(`      timeIn: ${r.timeIn}`);
      console.log(`      timeOut: ${r.timeOut}`);
      console.log(`      createdAt: ${r.createdAt}`);
      console.log(`      entryImage: ${!!r.entryImage?.url}`);
      if (r.entryImage?.url) {
        console.log(`      entryImage URL: ${r.entryImage.url.substring(0, 50)}...`);
      }
      console.log('');
    });
    
    await mongoose.disconnect();
  } catch(err) {
    console.error('❌ Error:', err.message);
  }
}

testAPIQuery();
