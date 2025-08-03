// Test đầy đủ để xác minh vé tháng hoạt động
const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');

// Import controllers
const esp32Controller = require('./controllers/esp32Controller');

const app = express();
app.use(express.json({ limit: '50mb' }));

// Test endpoint
app.post('/api/esp32/check-subscription', esp32Controller.checkSubscriptionAndOpenGate);

const testFullFlow = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-parking');
    console.log('✅ Connected to database');

    console.log('\\n🧪 Testing ESP32 Subscription Check');
    console.log('=====================================');

    // Test 1: Exact match
    console.log('\\nTest 1: Exact license plate match');
    const exactTest = await request(app)
      .post('/api/esp32/check-subscription')
      .send({
        licensePlate: '63-B1 84240',
        cameraIndex: 1
      });

    console.log('Response:', exactTest.body.message);
    console.log('Can open gate:', exactTest.body.canOpen ? '✅ YES' : '❌ NO');

    // Test 2: OCR với lỗi
    console.log('\\nTest 2: OCR reading with errors');
    const fuzzyTest = await request(app)
      .post('/api/esp32/check-subscription')
      .send({
        licensePlate: '63-B1*842.40',
        cameraIndex: 1
      });

    console.log('Response:', fuzzyTest.body.message);
    console.log('Can open gate:', fuzzyTest.body.canOpen ? '✅ YES' : '❌ NO');

    // Test 3: Completely wrong plate
    console.log('\\nTest 3: Wrong license plate');
    const wrongTest = await request(app)
      .post('/api/esp32/check-subscription')
      .send({
        licensePlate: 'XX-YZ 99999',
        cameraIndex: 1
      });

    console.log('Response:', wrongTest.body.message);
    console.log('Can open gate:', wrongTest.body.canOpen ? '✅ YES' : '❌ NO');

    console.log('\\n📊 Summary:');
    console.log('Test 1 & 2 should show: ✅ CAN OPEN (subscription found)');
    console.log('Test 3 should show: ❌ CANNOT OPEN (no subscription)');

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\\n📴 Disconnected from database');
  }
};

// Chạy test
if (require.main === module) {
  testFullFlow();
}
