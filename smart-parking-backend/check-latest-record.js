const mongoose = require('mongoose');
const ParkingRecord = require('./models/ParkingRecord');

async function checkLatestRecord() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://caochien12:x2WEd6LAwKQMy5Lw@cluster0.lsol1da.mongodb.net/parking');
    
    console.log('📊 Checking latest parking record...');
    
    const record = await ParkingRecord.findOne({ rfid: 'TEST123ABC' }).sort({ createdAt: -1 });
    
    if (record) {
      console.log('✅ Found latest record:');
      console.log('   - ID:', record._id);
      console.log('   - RFID:', record.rfid);
      console.log('   - License:', record.licensePlate);
      console.log('   - TimeIn:', record.timeIn);
      console.log('   - TimeOut:', record.timeOut);
      console.log('   - Entry Image:', record.entryImage);
      console.log('   - Exit Image:', record.exitImage);
      
      if (record.entryImage && record.entryImage.url) {
        console.log('   - Entry URL:', record.entryImage.url);
      }
      if (record.exitImage && record.exitImage.url) {
        console.log('   - Exit URL:', record.exitImage.url);
      }
    } else {
      console.log('❌ No record found');
    }
    
    await mongoose.disconnect();
  } catch(err) {
    console.error('❌ Error:', err.message);
  }
}

checkLatestRecord();
