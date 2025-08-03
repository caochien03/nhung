// Test toàn bộ luồng xe vào và xe ra
const express = require('express');
const mongoose = require('mongoose');
const esp32Controller = require('./controllers/esp32Controller');
const ParkingRecord = require('./models/ParkingRecord');

const app = express();
app.use(express.json({ limit: '50mb' }));

const testParkingFlow = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-parking');
    console.log('✅ Connected to database');

    // Mock response helper
    const createMockResponse = (label) => ({
      json: (data) => {
        console.log(`\n📋 ${label} Response:`);
        console.log('Action:', data.action);
        console.log('Message:', data.message);
        console.log('UID:', data.uid);
        console.log('License Plate:', data.licensePlate);
        console.log('Camera:', data.cameraIndex);
        
        if (data.paymentType) {
          console.log('Payment Type:', data.paymentType);
          console.log('Subscription Used:', data.subscriptionUsed ? '✅ YES' : '❌ NO');
          console.log('Should Open Gate:', data.shouldOpenGate ? '🚪 OPEN' : '🚫 CLOSED');
        }
        
        if (data.similarity) {
          console.log('Plate Match:', data.plateMatch);
          console.log('Similarity:', data.similarity);
        }
        
        if (data.fee !== undefined) {
          console.log('Fee:', data.fee + 'đ');
          console.log('Fee Type:', data.feeType);
        }
        
        console.log('Timestamp:', data.timestamp);
        console.log('─'.repeat(50));
      }
    });

    console.log('\n🚗 TESTING PARKING FLOW');
    console.log('='.repeat(60));

    // Test 1: Xe vào với vé tháng
    console.log('\n📥 TEST 1: XE VÀO VỚI VÉ THÁNG');
    const entryRequestSubscription = {
      body: {
        uid: "D3477DF5",
        cameraIndex: 1,
        licensePlate: "63-B1*842.40", // OCR với lỗi
        imageData: null
      }
    };

    await esp32Controller.autoCapture(entryRequestSubscription, createMockResponse('ENTRY'));
    
    // Đợi 2 giây
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Xe ra với vé tháng  
    console.log('\n📤 TEST 2: XE RA VỚI VÉ THÁNG');
    const exitRequestSubscription = {
      body: {
        uid: "D3477DF5", // Cùng UID
        cameraIndex: 2,
        licensePlate: "63-B1*842.40", // OCR với lỗi
        imageData: null
      }
    };

    await esp32Controller.autoCapture(exitRequestSubscription, createMockResponse('EXIT'));

    // Đợi 2 giây
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 3: Xe vào KHÔNG có vé tháng (vé lượt)
    console.log('\n📥 TEST 3: XE VÀO VÉ LƯỢT');
    const entryRequestHourly = {
      body: {
        uid: "B2EBC905", // UID khác
        cameraIndex: 1,
        licensePlate: "29-A1 123.45", // Biển số không có vé tháng
        imageData: null
      }
    };

    await esp32Controller.autoCapture(entryRequestHourly, createMockResponse('ENTRY HOURLY'));

    // Đợi 3 giây để tính phí
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test 4: Xe ra với vé lượt
    console.log('\n📤 TEST 4: XE RA VÉ LƯỢT');
    const exitRequestHourly = {
      body: {
        uid: "B2EBC905", // Cùng UID
        cameraIndex: 2,
        licensePlate: "29-A1 123.45", // Cùng biển số
        imageData: null
      }
    };

    await esp32Controller.autoCapture(exitRequestHourly, createMockResponse('EXIT HOURLY'));

    // Test 5: Kiểm tra records trong database
    console.log('\n📊 TEST 5: KIỂM TRA DATABASE RECORDS');
    const allRecords = await ParkingRecord.find().sort({ timeIn: -1 }).limit(5);
    
    console.log(`\n📋 Found ${allRecords.length} parking records:`);
    allRecords.forEach((record, index) => {
      console.log(`\n${index + 1}. Record ID: ${record._id}`);
      console.log(`   RFID: ${record.rfid}`);
      console.log(`   License Plate: ${record.licensePlate}`);
      console.log(`   Payment Type: ${record.paymentType}`);
      console.log(`   Payment Status: ${record.paymentStatus}`);
      console.log(`   Fee: ${record.fee || 0}đ`);
      console.log(`   Status: ${record.status}`);
      console.log(`   Time In: ${record.timeIn}`);
      console.log(`   Time Out: ${record.timeOut || 'Still parked'}`);
    });

    console.log('\n✅ PARKING FLOW TEST COMPLETED');

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📴 Disconnected from database');
  }
};

testParkingFlow();
