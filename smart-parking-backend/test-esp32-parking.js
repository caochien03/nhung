// Test subscription với ESP32 controller
const express = require('express');
const mongoose = require('mongoose');
const esp32Controller = require('./controllers/esp32Controller');

const app = express();
app.use(express.json({ limit: '50mb' }));

// Route
app.post('/test-parking', esp32Controller.autoCapture);

const testESP32Parking = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-parking');
    console.log('✅ Connected to database');

    // Simulate ESP32 autoCapture request
    const mockRequest = {
      body: {
        uid: "D3477DF5",
        cameraIndex: 1,
        imageData: null // Không có ảnh để đơn giản
      }
    };

    const mockResponse = {
      json: (data) => {
        console.log('\\n📋 ESP32 Response:');
        console.log('Action:', data.action);
        console.log('Message:', data.message);
        console.log('Should open gate:', data.shouldOpenGate);
        console.log('Payment type:', data.paymentType);
        if (data.subscriptionUsed) {
          console.log('✅ SUBSCRIPTION USED - FREE PARKING!');
        } else {
          console.log('💰 PAY-PER-USE - Will be charged');
        }
      }
    };

    // Manually set license plate (simulate OCR result)
    mockRequest.body.licensePlate = "63-B1*842.40"; // OCR with errors

    console.log('🚗 Testing parking with license plate:', mockRequest.body.licensePlate);
    
    await esp32Controller.autoCapture(mockRequest, mockResponse);

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\\n📴 Disconnected from database');
  }
};

testESP32Parking();
