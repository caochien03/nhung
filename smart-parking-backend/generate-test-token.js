require('dotenv').config();
const jwt = require('jsonwebtoken');

// Tạo token test cho staff
const testStaffPayload = {
  id: '507f1f77bcf86cd799439011', // ObjectId giả
  username: 'test-staff',
  role: 'staff'
};

const token = jwt.sign(testStaffPayload, process.env.JWT_SECRET || 'your-super-secret-key-for-parking-system-2024', {
  expiresIn: '24h'
});

console.log('🔑 Test Staff Token:');
console.log(token);
console.log('\n📝 Usage:');
console.log(`curl -H "Authorization: Bearer ${token}" "http://localhost:8080/api/parking/history-with-images?page=1&limit=3"`);
