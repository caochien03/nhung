require('dotenv').config();
const mongoose = require('mongoose');
const ParkingRecord = require('../models/ParkingRecord');
const { uploadBase64Image } = require('../utils/cloudinaryHelper');

// Test data
const testImage = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';

const createTestData = async () => {
  try {
    // Kết nối database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-parking');
    console.log('✅ Connected to MongoDB');

    // Xóa dữ liệu test cũ
    await ParkingRecord.deleteMany({ rfid: { $regex: '^TEST_' } });
    console.log('🧹 Cleaned old test data');

    // Tạo test records với hình ảnh
    const testRecords = [];

    for (let i = 1; i <= 5; i++) {
      // Record xe vào
      const entryImage = await uploadBase64Image(
        testImage,
        `TEST-${i.toString().padStart(3, '0')}`,
        'in',
        1
      );

      const entryRecord = new ParkingRecord({
        rfid: `TEST_RFID_${i}`,
        licensePlate: `TEST-${i.toString().padStart(3, '0')}`,
        timeIn: new Date(Date.now() - (i * 60000)), // i phút trước
        entryImage,
        cameraIndex: 1,
        status: 'active',
        isRegisteredUser: i % 2 === 0
      });

      await entryRecord.save();
      testRecords.push(entryRecord);

      // Record xe ra (cho một vài records)
      if (i <= 3) {
        const exitImage = await uploadBase64Image(
          testImage,
          `TEST-${i.toString().padStart(3, '0')}`,
          'out',
          2
        );

        entryRecord.timeOut = new Date(Date.now() - ((i - 1) * 30000)); // ra sau vào 30s
        entryRecord.exitImage = exitImage;
        entryRecord.status = 'completed';
        entryRecord.fee = 35000;
        entryRecord.feeType = 'Theo giờ (35k)';

        await entryRecord.save();
      }

      console.log(`✅ Created test record ${i}: ${entryRecord.licensePlate}`);
    }

    console.log(`🎉 Created ${testRecords.length} test records with images`);
    console.log('📝 Test data summary:');
    console.log(`   - Active records: ${testRecords.filter(r => r.status === 'active').length}`);
    console.log(`   - Completed records: ${testRecords.filter(r => r.status === 'completed').length}`);
    console.log(`   - Registered users: ${testRecords.filter(r => r.isRegisteredUser).length}`);

    // Test API endpoints
    console.log('\n🔧 Test these endpoints:');
    console.log('GET /api/parking/history/images?date=' + new Date().toISOString().split('T')[0]);
    console.log('GET /api/parking/history/range?startDate=' + new Date().toISOString().split('T')[0] + '&endDate=' + new Date().toISOString().split('T')[0]);
    console.log('GET /api/cleanup/stats');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error creating test data:', error);
    process.exit(1);
  }
};

// Chạy script
if (require.main === module) {
  createTestData();
}

module.exports = { createTestData };
