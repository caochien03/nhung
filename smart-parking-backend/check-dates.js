const mongoose = require('mongoose');
const ParkingRecord = require('./models/ParkingRecord');

async function checkDates() {
  try {
    await mongoose.connect('mongodb://localhost:27017/smart_parking');
    
    const records = await ParkingRecord.find({}).sort({ createdAt: -1 });
    console.log('📊 Found', records.length, 'parking records:');
    
    records.forEach((record, index) => {
      console.log(`${index + 1}. ${record._id}`);
      console.log('   License:', record.licensePlate);
      console.log('   TimeIn:', record.timeIn);
      console.log('   TimeOut:', record.timeOut);
      console.log('   CreatedAt:', record.createdAt);
      console.log('   Has Entry Image:', !!record.entryImage?.url);
      console.log('   Has Exit Image:', !!record.exitImage?.url);
      if (record.entryImage?.url) {
        console.log('   Entry URL:', record.entryImage.url.substring(0, 50) + '...');
      }
      console.log('');
    });
    
    await mongoose.disconnect();
  } catch(err) {
    console.error('❌ Error:', err.message);
  }
}

checkDates();
