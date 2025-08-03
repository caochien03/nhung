// Test WebSocket notifications cho dashboard
const WebSocket = require('ws');
const mongoose = require('mongoose');
const esp32Controller = require('./controllers/esp32Controller');

const testDashboardNotifications = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-parking');
    console.log('✅ Connected to database');

    // Connect to WebSocket để nhận notifications
    console.log('📡 Connecting to WebSocket...');
    const ws = new WebSocket('ws://localhost:8080');

    ws.on('open', () => {
      console.log('✅ WebSocket connected - Ready to receive notifications');
    });

    ws.on('message', (data) => {
      const notification = JSON.parse(data);
      console.log('\n📋 DASHBOARD NOTIFICATION RECEIVED:');
      console.log('Type:', notification.type);
      console.log('Message:', notification.message);
      console.log('Details:', notification.details);
      console.log('─'.repeat(50));
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });

    // Đợi WebSocket kết nối
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\n🚗 TESTING DASHBOARD NOTIFICATIONS');
    console.log('='.repeat(60));

    // Mock response (không quan tâm response)
    const mockResponse = {
      json: (data) => {
        // console.log('Response sent to ESP32:', data.action);
      }
    };

    // Test 1: Xe vào với vé tháng
    console.log('\n📥 Test 1: Xe vào với vé tháng');
    await esp32Controller.autoCapture({
      body: {
        uid: "D3477DF5",
        cameraIndex: 1,
        licensePlate: "63-B1*842.40",
        imageData: null
      }
    }, mockResponse);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Xe ra với vé tháng
    console.log('\n📤 Test 2: Xe ra với vé tháng');
    await esp32Controller.autoCapture({
      body: {
        uid: "D3477DF5",
        cameraIndex: 2,
        licensePlate: "63-B1*842.40",
        imageData: null
      }
    }, mockResponse);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 3: Xe vào với vé lượt
    console.log('\n📥 Test 3: Xe vào với vé lượt');
    await esp32Controller.autoCapture({
      body: {
        uid: "B2EBC905",
        cameraIndex: 1,
        licensePlate: "51-F1 999.99",
        imageData: null
      }
    }, mockResponse);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 4: Xe ra với vé lượt
    console.log('\n📤 Test 4: Xe ra với vé lượt');
    await esp32Controller.autoCapture({
      body: {
        uid: "B2EBC905",
        cameraIndex: 2,
        licensePlate: "51-F1 999.99",
        imageData: null
      }
    }, mockResponse);

    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n✅ DASHBOARD NOTIFICATION TEST COMPLETED');
    
    ws.close();

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📴 Disconnected from database');
  }
};

testDashboardNotifications();
