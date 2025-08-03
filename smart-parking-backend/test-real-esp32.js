// Test ESP32 như thực tế
const mongoose = require('mongoose');
const esp32Controller = require('./controllers/esp32Controller');

const testRealESP32Flow = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-parking');
    console.log('✅ Connected to database');

    console.log('\n🎯 TESTING REAL ESP32 FLOW');
    console.log('='.repeat(50));

    // Simulate thực tế: ESP32 gửi RFID + OCR result
    const mockResponse = (label) => ({
      json: (data) => {
        console.log(`\n📋 ${label}:`);
        console.log(`🎯 Action: ${data.action}`);
        console.log(`📝 Message: ${data.message}`);
        console.log(`🚗 License: ${data.licensePlate || data.entryPlate || data.exitPlate || 'N/A'}`);
        console.log(`💳 Payment: ${data.paymentType || 'N/A'}`);
        console.log(`🎫 Subscription: ${data.subscriptionUsed ? '✅ USED' : '❌ NO'}`);
        console.log(`🚪 Gate: ${data.shouldOpenGate ? '🟢 OPEN' : '🔴 CLOSED'}`);
        if (data.fee !== undefined) {
          console.log(`💰 Fee: ${data.fee}`);
        }
        if (data.subscriptionInfo) {
          console.log(`🎫 ${data.subscriptionInfo}`);
        }
        if (data.parkingDuration) {
          console.log(`⏱️  Duration: ${data.parkingDuration}`);
        }
        console.log('─'.repeat(40));
      }
    });

    // Test 1: Xe vào có vé tháng
    console.log('\n🚗➡️ TEST: XE VÀO CÓ VÉ THÁNG');
    await esp32Controller.autoCapture({
      body: {
        uid: "D3477DF5",
        cameraIndex: 1,
        licensePlate: "63-B1*842.40", // OCR reading
        imageData: null
      }
    }, mockResponse('VEHICLE ENTRY'));

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 2: Xe ra có vé tháng  
    console.log('\n🚗⬅️ TEST: XE RA CÓ VÉ THÁNG');
    await esp32Controller.autoCapture({
      body: {
        uid: "D3477DF5",
        cameraIndex: 2,
        licensePlate: "63-B1*842.40", // OCR reading
        imageData: null
      }
    }, mockResponse('VEHICLE EXIT'));

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 3: Xe vào KHÔNG có vé tháng
    console.log('\n🚗➡️ TEST: XE VÀO KHÔNG CÓ VÉ THÁNG');
    await esp32Controller.autoCapture({
      body: {
        uid: "B2EBC905",
        cameraIndex: 1,
        licensePlate: "51-F1 999.99", // Biển số mới
        imageData: null
      }
    }, mockResponse('HOURLY VEHICLE ENTRY'));

    await new Promise(resolve => setTimeout(resolve, 2000)); // Đỗ 2 giây

    // Test 4: Xe ra vé lượt
    console.log('\n🚗⬅️ TEST: XE RA VÉ LƯỢT');
    await esp32Controller.autoCapture({
      body: {
        uid: "B2EBC905",
        cameraIndex: 2,
        licensePlate: "51-F1 999.99", // Cùng biển số
        imageData: null
      }
    }, mockResponse('HOURLY VEHICLE EXIT'));

    console.log('\n✅ REAL ESP32 FLOW TEST COMPLETED');

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📴 Disconnected from database');
  }
};

testRealESP32Flow();
