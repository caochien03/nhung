# Tích hợp Cloudinary - Lịch sử xe vào/ra có hình ảnh

## Tổng quan

Hệ thống đã được tích hợp Cloudinary để lưu trữ hình ảnh xe vào/ra và cung cấp tính năng xem lịch sử cho staff với các ràng buộc:
- Xem lịch sử trong ngày
- Xem lại tối đa 3 ngày trước đó
- Tự động xóa dữ liệu sau 3 ngày

## Cấu hình Cloudinary

### 1. Tạo tài khoản Cloudinary
1. Đăng ký tại: https://cloudinary.com/
2. Lấy thông tin cấu hình từ Dashboard:
   - Cloud Name
   - API Key  
   - API Secret

### 2. Cấu hình môi trường

Thêm vào file `.env`:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Tính năng mới

### 1. Backend APIs

#### Lịch sử xe vào/ra với hình ảnh
- `GET /api/parking/history/images` - Lịch sử theo ngày
- `GET /api/parking/history/range` - Lịch sử theo khoảng thời gian (tối đa 3 ngày)
- `GET /api/parking/:id/images` - Chi tiết record có hình ảnh

#### Quản lý cleanup
- `POST /api/cleanup/manual` - Chạy cleanup thủ công
- `GET /api/cleanup/stats` - Thống kê lưu trữ

### 2. Lưu trữ hình ảnh

#### Cấu trúc lưu trữ
```
smart-parking/
├── parking/
│   ├── in/
│   │   └── {licensePlate}_{timestamp}_cam{cameraIndex}.jpg
│   └── out/
│       └── {licensePlate}_{timestamp}_cam{cameraIndex}.jpg
```

#### Metadata
- **Tags**: action (in/out), camera_X, license_plate
- **Context**: license_plate, action, camera, timestamp

### 3. Model cập nhật

```javascript
// ParkingRecord Schema
{
  // Hình ảnh xe vào
  entryImage: {
    url: String,
    publicId: String,
    format: String,
    width: Number,
    height: Number
  },
  // Hình ảnh xe ra  
  exitImage: {
    url: String,
    publicId: String,
    format: String,
    width: Number,
    height: Number
  }
}
```

### 4. Cleanup tự động

#### Cron jobs
- **Cleanup hàng ngày**: 2:00 AM (GMT+7) - Xóa dữ liệu > 3 ngày
- **Báo cáo hàng tuần**: Chủ nhật 1:00 AM - Thống kê lưu trữ

## Sử dụng

### 1. Staff - Xem lịch sử xe vào/ra

```javascript
// Component: ParkingHistoryWithImages
import ParkingHistoryWithImages from '../components/staff/ParkingHistoryWithImages';

// Sử dụng trong routes staff
<Route path="/parking/history" component={ParkingHistoryWithImages} />
```

#### Tính năng:
- ✅ Xem lịch sử theo ngày (mặc định hôm nay)
- ✅ Xem lịch sử trong khoảng 3 ngày
- ✅ Lọc theo biển số xe
- ✅ Lọc theo hành động (vào/ra)
- ✅ Xem hình ảnh phóng to
- ✅ Chi tiết từng record
- ✅ Phân trang

### 2. Admin - Quản lý lưu trữ

```javascript
// Component: StorageManagement
import StorageManagement from '../components/admin/StorageManagement';

// Sử dụng trong routes admin
<Route path="/storage" component={StorageManagement} />
```

#### Tính năng:
- ✅ Thống kê lưu trữ tổng quan
- ✅ Thống kê theo khoảng thời gian
- ✅ Chạy cleanup thủ công
- ✅ Cấu hình số ngày cleanup

## API Examples

### 1. Lấy lịch sử hôm nay

```bash
GET /api/parking/history/images?date=2025-01-02
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "_id": "record_id_in",
      "recordId": "record_id",
      "rfid": "12345678",
      "licensePlate": "29A-12345",
      "action": "in",
      "timestamp": "2025-01-02T08:30:00.000Z",
      "image": {
        "url": "https://res.cloudinary.com/...",
        "publicId": "smart-parking/parking/in/29A-12345_...",
        "format": "jpg",
        "width": 1920,
        "height": 1080
      },
      "cameraIndex": 1,
      "userId": "user_id",
      "isRegisteredUser": true
    }
  ],
  "pagination": {
    "current": 1,
    "total": 5,
    "totalRecords": 100
  },
  "summary": {
    "date": "2025-01-02",
    "totalEntries": 50,
    "totalExits": 50
  }
}
```

### 2. Lấy lịch sử khoảng thời gian

```bash
GET /api/parking/history/range?startDate=2024-12-31&endDate=2025-01-02
```

### 3. Chạy cleanup thủ công

```bash
POST /api/cleanup/manual
Content-Type: application/json

{
  "days": 3
}
```

Response:
```json
{
  "success": true,
  "message": "Đã xóa dữ liệu cũ hơn 3 ngày",
  "data": {
    "deletedImages": 150,
    "deletedRecords": 75,
    "cutoffDate": "2024-12-30T00:00:00.000Z"
  }
}
```

### 4. Thống kê lưu trữ

```bash
GET /api/cleanup/stats
```

Response:
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRecords": 1000,
      "totalWithImages": 800,
      "oldRecords": 50,
      "nextCleanupWillDelete": 50
    },
    "periodStats": [
      {
        "period": "Today",
        "days": 0,
        "dateRange": {
          "start": "2025-01-02",
          "end": "2025-01-02"
        },
        "records": {
          "total": 100,
          "withEntryImage": 45,
          "withExitImage": 40,
          "withBothImages": 35,
          "withoutImages": 50
        }
      }
    ]
  }
}
```

## Bảo mật

### 1. Quyền truy cập
- **Staff**: Xem lịch sử xe vào/ra
- **Admin**: Toàn bộ quyền + quản lý cleanup

### 2. Giới hạn
- Chỉ xem được tối đa 3 ngày trước
- Cleanup tự động sau 3 ngày
- Rate limiting cho API

## Monitoring

### 1. Logs
```bash
# Cleanup job logs
🧹 Starting cleanup job for old parking data...
✅ Deleted 150 old images from Cloudinary
✅ Deleted 75 old parking records from database
🎉 Cleanup job completed successfully

# Storage report logs  
📈 Weekly Storage Report (2025-01-02):
   Total records with images: 800
   Recent records (last 7 days): 500
   Older records: 300
```

### 2. Health check
```bash
# Kiểm tra kết nối Cloudinary
GET /api/health/cloudinary

# Kiểm tra cleanup jobs
GET /api/health/jobs
```

## Troubleshooting

### 1. Lỗi upload hình ảnh
- Kiểm tra cấu hình Cloudinary
- Kiểm tra dung lượng storage
- Xem logs upload

### 2. Cleanup không chạy
- Kiểm tra cron job setup
- Xem timezone configuration  
- Kiểm tra quyền admin

### 3. Hình ảnh không hiển thị
- Kiểm tra URL Cloudinary
- Kiểm tra CORS settings
- Xem network logs

## Production Deployment

### 1. Environment variables
```env
NODE_ENV=production
CLOUDINARY_CLOUD_NAME=prod_cloud_name
CLOUDINARY_API_KEY=prod_api_key
CLOUDINARY_API_SECRET=prod_api_secret
```

### 2. PM2 configuration
```json
{
  "name": "smart-parking-api",
  "script": "app.js",
  "env": {
    "NODE_ENV": "production"
  },
  "cron_restart": "0 2 * * *"
}
```

### 3. Nginx configuration
```nginx
# Tăng giới hạn upload cho hình ảnh
client_max_body_size 10M;

# Cache hình ảnh Cloudinary
location ~* \.(jpg|jpeg|png|gif)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```
