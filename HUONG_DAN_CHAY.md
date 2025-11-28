# Hướng dẫn chạy Settings/CMS Service

## ✅ Backend đã sẵn sàng

Service `settings-cms-service` đã được build và chạy thành công:
- **Port**: 8086
- **Eureka**: Đã đăng ký thành công
- **API Gateway**: Đã cấu hình route `/api/settings/**`

## 🚀 Chạy Frontend

### Bước 1: Mở terminal và chuyển đến thư mục FE
```powershell
cd "E:\DACN\Git DACN\FE_QLKH"
```

### Bước 2: Cài đặt dependencies (nếu chưa có)
```powershell
npm install
```

### Bước 3: Chạy development server
```powershell
npm run dev
```

Frontend sẽ chạy tại: **http://localhost:3000**

## 📍 Truy cập Settings

1. **Đăng nhập** vào hệ thống (nếu chưa đăng nhập)
2. Vào menu **"Hệ thống"** > **"Cài đặt hệ thống"**
   - Hoặc truy cập trực tiếp: `http://localhost:3000/settings`

## 🧪 Test API trực tiếp

### Lấy tất cả settings:
```bash
GET http://localhost:8080/api/settings
Authorization: Bearer <your-token>
```

### Tạo setting mới:
```bash
POST http://localhost:8080/api/settings
Content-Type: application/json
Authorization: Bearer <your-token>

{
  "key": "site_name",
  "value": "Cửa hàng ABC",
  "description": "Tên cửa hàng"
}
```

### Lấy setting theo key:
```bash
GET http://localhost:8080/api/settings/site_name
Authorization: Bearer <your-token>
```

## 📋 Kiểm tra Database

Đảm bảo table `shop_settings` đã tồn tại trong database `qlkh`:

```sql
CREATE TABLE IF NOT EXISTS shop_settings (
    id_sst BIGINT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT,
    description TEXT,
    created_at DATETIME,
    updated_at DATETIME
);
```

## 🔍 Kiểm tra Service

### Xem logs:
```powershell
cd "E:\DACN\Git DACN\BE_QLKH"
docker compose logs -f settings-cms-service
```

### Kiểm tra Eureka:
- Mở: http://localhost:8761
- Tìm service: `SETTINGS-CMS-SERVICE`

### Kiểm tra health:
```bash
GET http://localhost:8080/api/settings
```

## 🎯 Tính năng đã hoàn thiện

✅ CRUD đầy đủ (Create, Read, Update, Delete)
✅ Tìm kiếm và phân trang
✅ Xem chi tiết trong modal
✅ Validation form với character counter
✅ Error handling và user feedback
✅ UI/UX nhất quán với hệ thống

## 🐛 Troubleshooting

### Service không chạy:
```powershell
cd "E:\DACN\Git DACN\BE_QLKH"
docker compose restart settings-cms-service
```

### Rebuild service:
```powershell
cd "E:\DACN\Git DACN\BE_QLKH\settings-cms-service"
.\mvnw.cmd clean package -DskipTests
cd ..
docker compose build settings-cms-service
docker compose up -d settings-cms-service
```

### Frontend không kết nối được:
- Kiểm tra API Gateway đang chạy: `http://localhost:8080`
- Kiểm tra token trong localStorage
- Xem console browser để debug

