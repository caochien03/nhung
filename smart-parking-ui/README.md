# 🚀 Smart Parking System - Frontend

## 📋 Tổng quan

Frontend cho hệ thống Smart Parking với các tính năng quản lý bãi xe thông minh, tích hợp ESP32, nhận diện biển số và thanh toán tự động.

## 🎯 Tính năng chính

### 👨‍💼 **Admin Dashboard**
- Quản lý người dùng và nhân viên
- Báo cáo doanh thu và thống kê
- Giám sát hệ thống real-time
- Xuất báo cáo Excel

### 👷‍♂️ **Staff Dashboard**
- Hiển thị camera vào/ra trực tiếp
- Quản lý thanh toán thủ công
- Mở/đóng barie
- Xem xe đang đỗ và phí cần thu

### 👤 **User Dashboard**
- Đăng ký biển số xe
- Xem lịch sử gửi xe
- Quản lý tài khoản và số dư
- Thanh toán qua QR code

## 🛠️ Công nghệ sử dụng

- **React 18** + TypeScript
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Recharts** - Charts và biểu đồ
- **React Hook Form** - Form handling
- **React Hot Toast** - Notifications
- **Lucide React** - Icons
- **WebSocket** - Real-time communication

## 📁 Cấu trúc dự án

```
src/
├── components/
│   ├── dashboard/          # Dashboard components
│   │   ├── DashboardOverview.tsx
│   │   ├── CameraMonitor.tsx
│   │   └── PaymentManager.tsx
│   ├── forms/             # Form components
│   ├── tables/            # Table components
│   ├── charts/            # Chart components
│   ├── ui/                # UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── index.ts
│   └── Layout.tsx         # Main layout
├── pages/
│   ├── admin/             # Admin pages
│   │   └── AdminDashboard.tsx
│   ├── staff/             # Staff pages
│   │   └── StaffDashboard.tsx
│   ├── user/              # User pages
│   │   └── UserDashboard.tsx
│   └── LoginPage.tsx      # Login page
├── services/
│   ├── api.ts             # API services
│   └── websocket.ts       # WebSocket service
├── contexts/
│   └── AuthContext.tsx    # Authentication context
├── types/
│   └── index.ts           # TypeScript types
├── hooks/                 # Custom hooks
├── utils/                 # Utility functions
└── App.tsx                # Main app component
```

## 🚀 Cài đặt và chạy

### 1. Cài đặt dependencies
```bash
npm install
```

### 2. Chạy development server
```bash
npm start
```

### 3. Build cho production
```bash
npm run build
```

## 🔧 Cấu hình

### Backend API
- **URL**: http://localhost:8080
- **WebSocket**: ws://localhost:8080

### Environment Variables
Tạo file `.env`:
```env
REACT_APP_API_URL=http://localhost:8080
REACT_APP_WS_URL=ws://localhost:8080
```

## 👥 Tài khoản demo

### Admin
- **Username**: admin
- **Password**: admin123
- **Quyền**: Quản lý toàn bộ hệ thống

### Staff
- **Username**: staff
- **Password**: staff123
- **Quyền**: Quản lý bãi xe và thanh toán

### User
- **Username**: user
- **Password**: user123
- **Quyền**: Xem thông tin cá nhân

## 📱 Responsive Design

Hệ thống được thiết kế responsive cho:
- **Desktop** (1024px+)
- **Tablet** (768px - 1023px)
- **Mobile** (320px - 767px)

## 🔌 Tích hợp ESP32

### Camera Monitoring
- Hiển thị feed từ 2 camera (vào/ra)
- Real-time image capture
- OCR nhận diện biển số

### Barrie Control
- Mở/đóng barie thủ công
- Tự động mở khi nhận diện thành công
- Status monitoring

### RFID Integration
- Nhận UID từ ESP32
- Tự động tạo record parking
- Tính phí chính xác

## 💳 Hệ thống thanh toán

### QR Code Payment
- Tạo mã QR tự động
- Tích hợp với các cổng thanh toán
- Xác nhận thanh toán real-time

### Cash Payment
- Nhân viên xác nhận thanh toán
- In hóa đơn
- Cập nhật trạng thái

### Balance Payment
- Trừ từ số dư tài khoản
- Tự động cập nhật
- Lịch sử giao dịch

## 📊 Báo cáo và thống kê

### Dashboard Analytics
- Doanh thu theo ngày/tuần/tháng
- Số lượng xe vào/ra
- Phân bố loại xe
- Hiệu suất hệ thống

### Export Reports
- Excel format
- PDF reports
- Custom date ranges
- Multiple export options

## 🔒 Bảo mật

- JWT Authentication
- Role-based access control
- Secure API communication
- Input validation
- XSS protection

## 🚀 Deployment

### Build Production
```bash
npm run build
```

### Serve Static Files
```bash
npx serve -s build
```

### Docker (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

## 📞 Support

- **Email**: support@smartparking.com
- **Documentation**: [Wiki](https://github.com/smartparking/docs)
- **Issues**: [GitHub Issues](https://github.com/smartparking/issues)

---

**🎉 Chúc mừng! Hệ thống Smart Parking đã sẵn sàng!**
