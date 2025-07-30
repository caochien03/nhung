# 🚀 Smart Parking System - Backend API

## 📋 Tổng quan

Backend API cho hệ thống Smart Parking với tích hợp ESP32, nhận diện biển số bằng OCR, và quản lý thanh toán tự động.

## 🎯 Tính năng chính

### 🔐 **Authentication & Authorization**
- JWT-based authentication
- Role-based access control (Admin, Staff, User)
- Password hashing với bcrypt
- Session management

### 🅿️ **Parking Management**
- Quản lý xe vào/ra tự động
- Nhận diện biển số bằng OCR (PaddleOCR)
- Tích hợp ESP32 và RFID
- Tính phí tự động

### 💳 **Payment System**
- Thanh toán QR code
- Thanh toán tiền mặt
- Thanh toán từ số dư tài khoản
- Quản lý giao dịch

### 👥 **User Management**
- Quản lý người dùng (Admin)
- Đăng ký xe cho người dùng
- Quản lý số dư tài khoản
- Lịch sử gửi xe

### 📊 **Dashboard & Analytics**
- Thống kê doanh thu
- Báo cáo lưu lượng xe
- Monitoring hệ thống
- Export dữ liệu

## 🛠️ Công nghệ sử dụng

- **Node.js** + Express.js
- **MongoDB** + Mongoose
- **JWT** Authentication
- **WebSocket** Real-time communication
- **PaddleOCR** License plate recognition
- **ESP32** Integration

## 📁 Cấu trúc dự án

```
smart-parking-backend/
├── config/
│   └── db.js                 # Database connection
├── controllers/
│   ├── authController.js     # Authentication
│   ├── userController.js     # User management
│   ├── parkingController.js  # Parking management
│   ├── paymentController.js  # Payment processing
│   ├── dashboardController.js # Analytics
│   └── esp32Controller.js    # ESP32 integration
├── middleware/
│   └── auth.js               # JWT authentication
├── models/
│   ├── User.js               # User model
│   ├── Vehicle.js            # Vehicle model
│   ├── ParkingRecord.js      # Parking record model
│   └── Payment.js            # Payment model
├── routes/
│   ├── auth.js               # Auth routes
│   ├── users.js              # User routes
│   ├── parking.js            # Parking routes
│   ├── payments.js           # Payment routes
│   ├── dashboard.js          # Dashboard routes
│   └── esp32Routes.js        # ESP32 routes
├── scripts/
│   └── seedData.js           # Sample data
├── utils/
│   ├── recognizePlate_fastapi.js # OCR integration
│   └── recognizePlate_optimized.py
├── websocket.js              # WebSocket server
├── app.js                    # Main application
└── package.json
```

## 🚀 Cài đặt và chạy

### 1. **Cài đặt dependencies**
```bash
npm install
```

### 2. **Cấu hình môi trường**
Tạo file `.env`:
```env
PORT=8080
MONGODB_URI=
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

### 3. **Khởi tạo dữ liệu mẫu**
```bash
npm run seed
```

### 4. **Chạy development server**
```bash
npm run dev
```

### 5. **Chạy production server**
```bash
npm start
```

## 📡 API Endpoints

### 🔐 Authentication
```
POST   /api/auth/login          # Đăng nhập
POST   /api/auth/register       # Đăng ký
GET    /api/auth/me             # Thông tin user hiện tại
PUT    /api/auth/profile        # Cập nhật profile
PUT    /api/auth/change-password # Đổi mật khẩu
```

### 👥 User Management (Admin)
```
GET    /api/users               # Danh sách users
POST   /api/users               # Tạo user mới
GET    /api/users/:id           # Chi tiết user
PUT    /api/users/:id           # Cập nhật user
DELETE /api/users/:id           # Xóa user
PUT    /api/users/:id/balance   # Cập nhật số dư
GET    /api/users/:userId/vehicles # Xe của user
POST   /api/users/:userId/vehicles # Đăng ký xe
```

### 🅿️ Parking Management
```
POST   /api/parking             # Tạo parking record
GET    /api/parking             # Danh sách parking records
GET    /api/parking/active      # Xe đang đỗ
GET    /api/parking/:id         # Chi tiết parking record
PUT    /api/parking/:id/complete # Hoàn thành parking
GET    /api/parking/stats       # Thống kê parking
GET    /api/parking/user/:userId/history # Lịch sử user
```

### 💳 Payment Management
```
POST   /api/payments            # Tạo payment
GET    /api/payments            # Danh sách payments
GET    /api/payments/stats      # Thống kê payments
GET    /api/payments/record/:parkingRecordId # Payment theo record
POST   /api/payments/qr         # Tạo QR code
POST   /api/payments/qr/complete # Hoàn thành QR payment
```

### 📊 Dashboard & Analytics
```
GET    /api/dashboard/stats     # Thống kê tổng quan
GET    /api/dashboard/revenue   # Doanh thu
GET    /api/dashboard/revenue/today # Doanh thu hôm nay
GET    /api/dashboard/parking-stats # Thống kê parking
GET    /api/dashboard/system-status # Trạng thái hệ thống
```

### 🤖 ESP32 Integration
```
POST   /api/esp32/uid           # Nhận UID từ ESP32
POST   /api/esp32/auto-capture  # Tự động chụp và xử lý
```

## 🔧 Tích hợp ESP32

### Camera Integration
- **Camera vào**: `cameraIndex: 1`
- **Camera ra**: `cameraIndex: 2`
- **OCR Service**: FastAPI + PaddleOCR
- **Real-time**: WebSocket communication

### RFID Integration
- Nhận UID từ ESP32
- Tự động tạo parking record
- Tính phí chính xác
- Mở barie tự động

## 🔒 Bảo mật

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt với salt
- **Rate Limiting**: Chống spam requests
- **CORS Protection**: Cross-origin security
- **Input Validation**: Sanitize user input
- **Helmet**: Security headers

## 📊 Database Schema

### User Model
```javascript
{
  username: String,
  email: String,
  password: String (hashed),
  phone: String,
  role: "admin" | "staff" | "user",
  balance: Number,
  isActive: Boolean,
  lastLogin: Date
}
```

### Vehicle Model
```javascript
{
  licensePlate: String,
  userId: ObjectId,
  vehicleType: "car" | "truck" | "bus",
  isRegistered: Boolean,
  registrationDate: Date
}
```

### ParkingRecord Model
```javascript
{
  rfid: String,
  licensePlate: String,
  timeIn: Date,
  timeOut: Date,
  fee: Number,
  cameraIndex: Number,
  status: "active" | "completed" | "cancelled",
  paymentStatus: "pending" | "paid" | "failed",
  userId: ObjectId,
  isRegisteredUser: Boolean
}
```

### Payment Model
```javascript
{
  parkingRecordId: ObjectId,
  amount: Number,
  method: "qr" | "cash" | "balance",
  status: "pending" | "completed" | "failed",
  qrCode: String,
  transactionId: String,
  processedBy: ObjectId
}
```

## 🚀 Deployment

### Environment Variables
```env
PORT=8080
MONGODB_URI=mongodb://localhost:27017/parking
JWT_SECRET=your-super-secret-key
FRONTEND_URL=https://your-frontend.com
NODE_ENV=production
```

### Production Commands
```bash
# Install dependencies
npm install --production

# Start server
npm start

# Or with PM2
pm2 start app.js --name "smart-parking-backend"
```

## 📝 API Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (development only)"
}
```

## 🔧 Development

### Scripts
```bash
npm run dev      # Development với nodemon
npm run seed     # Khởi tạo dữ liệu mẫu
npm start        # Production start
```

### Testing
```bash
# Test API endpoints
curl -X GET http://localhost:8080/health

# Test authentication
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

## 📞 Support

- **Email**: support@smartparking.com
- **Documentation**: [API Docs](https://docs.smartparking.com)
- **Issues**: [GitHub Issues](https://github.com/smartparking/backend/issues)

---

**🎉 Smart Parking Backend đã sẵn sàng!** 