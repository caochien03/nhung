const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcrypt');

async function createStaffUser() {
  try {
    await mongoose.connect('mongodb://localhost:27017/smart_parking');
    
    // Check if staff user exists
    let staff = await User.findOne({ username: 'staff' });
    
    if (!staff) {
      // Create staff user
      const hashedPassword = await bcrypt.hash('123456', 10);
      staff = new User({
        username: 'staff',
        email: 'staff@example.com',
        password: hashedPassword,
        role: 'staff',
        phone: '0123456789',
        balance: 0,
        isActive: true
      });
      await staff.save();
      console.log('✅ Created staff user: staff/123456');
    } else {
      console.log('✅ Staff user already exists');
    }
    
    await mongoose.disconnect();
  } catch(err) {
    console.error('❌ Error:', err.message);
  }
}

createStaffUser();
