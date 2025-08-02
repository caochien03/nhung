const mongoose = require('mongoose');
const ParkingRecord = require('./models/ParkingRecord');

async function createTestData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/smart_parking');
    
    // Tạo test data với ảnh
    const testRecords = [
      {
        rfid: 'TEST001',
        licensePlate: '30A-12345',
        timeIn: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 giờ trước
        timeOut: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 giờ trước
        cameraIndex: 1,
        status: 'completed',
        paymentStatus: 'paid',
        fee: 35000,
        feeType: 'Theo giờ (35k)',
        originalFee: 35000,
        paymentType: 'hourly',
        paymentMethod: 'cash',
        isRegisteredUser: true,
        entryImage: {
          url: 'https://via.placeholder.com/400x300/4ade80/ffffff?text=Car+Entry+30A-12345',
          publicId: 'test_entry_1',
          format: 'jpg',
          width: 400,
          height: 300
        },
        exitImage: {
          url: 'https://via.placeholder.com/400x300/ef4444/ffffff?text=Car+Exit+30A-12345',
          publicId: 'test_exit_1', 
          format: 'jpg',
          width: 400,
          height: 300
        }
      },
      {
        rfid: 'TEST002',
        licensePlate: '29B-67890',
        timeIn: new Date(Date.now() - 3 * 60 * 60 * 1000),
        cameraIndex: 2,
        status: 'active',
        paymentStatus: 'pending',
        paymentType: 'hourly',
        isRegisteredUser: false,
        entryImage: {
          url: 'https://via.placeholder.com/400x300/3b82f6/ffffff?text=Truck+Entry+29B-67890',
          publicId: 'test_entry_2',
          format: 'jpg', 
          width: 400,
          height: 300
        }
      },
      {
        rfid: 'TEST003',
        licensePlate: '51C-11111',
        timeIn: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 ngày trước
        timeOut: new Date(Date.now() - 23 * 60 * 60 * 1000), // 23 giờ trước
        cameraIndex: 1,
        status: 'completed',
        paymentStatus: 'paid',
        fee: 50000,
        feeType: 'Qua đêm (50k)',
        originalFee: 50000,
        paymentType: 'hourly',
        paymentMethod: 'qr',
        isRegisteredUser: true,
        entryImage: {
          url: 'https://via.placeholder.com/400x300/8b5cf6/ffffff?text=Bike+Entry+51C-11111',
          publicId: 'test_entry_3',
          format: 'jpg',
          width: 400,
          height: 300
        },
        exitImage: {
          url: 'https://via.placeholder.com/400x300/f59e0b/ffffff?text=Bike+Exit+51C-11111',
          publicId: 'test_exit_3',
          format: 'jpg',
          width: 400,
          height: 300
        }
      },
      {
        rfid: 'TEST004',
        licensePlate: '92D-88888',
        timeIn: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 ngày trước  
        timeOut: new Date(Date.now() - 47 * 60 * 60 * 1000), // 47 giờ trước
        cameraIndex: 2,
        status: 'completed',
        paymentStatus: 'paid',
        fee: 35000,
        feeType: 'Theo giờ (35k)',
        originalFee: 35000,
        paymentType: 'hourly',
        paymentMethod: 'balance',
        isRegisteredUser: false,
        entryImage: {
          url: 'https://via.placeholder.com/400x300/10b981/ffffff?text=Van+Entry+92D-88888',
          publicId: 'test_entry_4',
          format: 'jpg',
          width: 400,
          height: 300
        },
        exitImage: {
          url: 'https://via.placeholder.com/400x300/dc2626/ffffff?text=Van+Exit+92D-88888',
          publicId: 'test_exit_4',
          format: 'jpg',
          width: 400,
          height: 300
        }
      }
    ];
    
    await ParkingRecord.insertMany(testRecords);
    console.log('✅ Created', testRecords.length, 'test parking records with images');
    
    const count = await ParkingRecord.countDocuments();
    console.log('📊 Total records in database:', count);
    
    // Hiển thị records có ảnh
    const withImages = await ParkingRecord.find({
      $or: [
        { entryImage: { $exists: true } },
        { exitImage: { $exists: true } }
      ]
    }).countDocuments();
    console.log('🖼️  Records with images:', withImages);
    
    await mongoose.disconnect();
    console.log('🔌 Database disconnected');
    
  } catch(err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

createTestData();
