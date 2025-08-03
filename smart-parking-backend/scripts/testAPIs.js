require('dotenv').config();
const mongoose = require('mongoose');
const parkingController = require('../controllers/parkingController');
const cleanupController = require('../controllers/cleanupController');

// Mock response object
const createMockRes = () => ({
  json: (data) => {
    console.log('Response:', JSON.stringify(data, null, 2));
    return this;
  },
  status: (code) => {
    console.log('Status:', code);
    return this;
  }
});

const testAPIs = async () => {
  try {
    // Kết nối database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-parking');
    console.log('✅ Connected to MongoDB');

    console.log('\n🧪 Testing parking history with images API...');
    
    // Test 1: Lấy lịch sử hôm nay
    const req1 = {
      query: {
        date: '2025-08-02',
        page: 1,
        limit: 10
      }
    };
    const res1 = createMockRes();
    
    console.log('\n📊 Testing GET /api/parking/history/images...');
    await parkingController.getParkingHistoryWithImages(req1, res1);

    // Test 2: Thống kê cleanup
    console.log('\n📊 Testing GET /api/cleanup/stats...');
    const req2 = { query: {} };
    const res2 = createMockRes();
    
    await cleanupController.getStorageStats(req2, res2);

    process.exit(0);

  } catch (error) {
    console.error('❌ Error testing APIs:', error);
    process.exit(1);
  }
};

// Chạy test
if (require.main === module) {
  testAPIs();
}

module.exports = { testAPIs };
