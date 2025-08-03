const mongoose = require('mongoose');
const ParkingRecord = require('./models/ParkingRecord');

async function checkRecentRecordsWithImages() {
    try {
        await mongoose.connect('mongodb+srv://nguyencaochien03:chien2003@cluster0.lsol1da.mongodb.net/parking');
        
        console.log('📊 Checking recent parking records...');
        
        // Lấy 5 record gần nhất
        const recentRecords = await ParkingRecord.find({})
            .sort({ timeIn: -1 })
            .limit(5)
            .lean();
        
        console.log(`\n🔍 Found ${recentRecords.length} recent records:\n`);
        
        recentRecords.forEach((record, index) => {
            console.log(`--- Record ${index + 1} ---`);
            console.log(`ID: ${record._id}`);
            console.log(`License Plate: ${record.licensePlate || 'N/A'}`);
            console.log(`RFID: ${record.rfid || 'N/A'}`);
            console.log(`Time In: ${record.timeIn}`);
            console.log(`Time Out: ${record.timeOut || 'Still parked'}`);
            console.log(`Status: ${record.status}`);
            
            // Kiểm tra ảnh
            if (record.entryImage) {
                console.log(`✅ Entry Image: YES`);
                console.log(`   URL: ${record.entryImage.url || 'No URL'}`);
                console.log(`   Public ID: ${record.entryImage.public_id || 'No public_id'}`);
            } else {
                console.log(`❌ Entry Image: NO`);
            }
            
            if (record.exitImage) {
                console.log(`✅ Exit Image: YES`);
                console.log(`   URL: ${record.exitImage.url || 'No URL'}`);
                console.log(`   Public ID: ${record.exitImage.public_id || 'No public_id'}`);
            } else {
                console.log(`❌ Exit Image: NO`);
            }
            
            console.log('');
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkRecentRecordsWithImages();
