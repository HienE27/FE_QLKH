# Hướng dẫn Test Phân Quyền và StatusSidebar

## 📋 Tổng quan

Hệ thống phân quyền đã được tích hợp vào các trang **Chi tiết phiếu nhập kho** và **Chi tiết phiếu xuất kho**. Các chức năng trong StatusSidebar sẽ chỉ hoạt động khi user có quyền tương ứng.

## 🔐 Các Role và Quyền

### Role: ADMIN
- ✅ **Tất cả quyền**: Có thể tạo, sửa, xóa, duyệt, từ chối, hủy phiếu nhập/xuất

### Role: MANAGER
- ✅ **Duyệt phiếu**: `IMPORT_APPROVE`, `EXPORT_APPROVE`
- ✅ **Từ chối phiếu**: `IMPORT_REJECT`, `EXPORT_REJECT`
- ✅ **Xem phiếu**: `IMPORT_VIEW`, `EXPORT_VIEW`

### Role: STAFF
- ✅ **Tạo phiếu**: `IMPORT_CREATE`, `EXPORT_CREATE`
- ✅ **Xem phiếu**: `IMPORT_VIEW`, `EXPORT_VIEW`

### Role: USER
- ✅ **Chỉ xem**: `IMPORT_VIEW`, `EXPORT_VIEW`

## 🧪 Cách Test

### Bước 1: Kiểm tra JWT Token có chứa Roles

1. **Đăng nhập vào hệ thống**
2. **Mở Developer Tools** (F12) → Tab **Application** → **Local Storage**
3. **Tìm key `access_token`** và copy giá trị
4. **Decode JWT token** tại https://jwt.io hoặc dùng lệnh sau trong Console:

```javascript
// Paste vào Console của browser
const token = localStorage.getItem('access_token');
const parts = token.split('.');
const payload = JSON.parse(atob(parts[1]));
console.log('User:', payload.sub || payload.username);
console.log('Roles:', payload.roles || payload.authorities);
```

**Kết quả mong đợi:**
- Token phải chứa field `roles` hoặc `authorities` là một mảng string
- Ví dụ: `["ADMIN"]`, `["MANAGER"]`, `["STAFF"]`, `["USER"]`

### Bước 2: Test với các Role khác nhau

#### Test Case 1: User với role ADMIN

1. **Đăng nhập với tài khoản ADMIN**
2. **Vào trang "Chi tiết phiếu nhập kho"** (phiếu có status = PENDING)
3. **Kiểm tra StatusSidebar:**
   - ✅ Nút "Xóa" (cam) - **ENABLED**
   - ✅ Nút "Duyệt" (vàng) - **ENABLED**
   - ✅ Nút "Từ chối" (đỏ) - **ENABLED**
4. **Click từng nút và xác nhận:**
   - "Duyệt" → Phiếu chuyển sang status "IMPORTED"
   - "Từ chối" → Phiếu chuyển sang status "REJECTED"
   - "Xóa" → Phiếu chuyển sang status "CANCELLED"

#### Test Case 2: User với role MANAGER

1. **Đăng nhập với tài khoản MANAGER**
2. **Vào trang "Chi tiết phiếu nhập kho"** (phiếu có status = PENDING)
3. **Kiểm tra StatusSidebar:**
   - ❌ Nút "Xóa" (cam) - **DISABLED** (không có quyền DELETE)
   - ✅ Nút "Duyệt" (vàng) - **ENABLED**
   - ✅ Nút "Từ chối" (đỏ) - **ENABLED**
4. **Hover vào nút "Xóa"** → Tooltip hiển thị: "Bạn không có quyền xóa phiếu"
5. **Click "Duyệt"** → Thành công
6. **Click "Từ chối"** → Thành công

#### Test Case 3: User với role STAFF

1. **Đăng nhập với tài khoản STAFF**
2. **Vào trang "Chi tiết phiếu nhập kho"** (phiếu có status = PENDING)
3. **Kiểm tra StatusSidebar:**
   - ❌ Nút "Xóa" (cam) - **DISABLED**
   - ❌ Nút "Duyệt" (vàng) - **DISABLED**
   - ❌ Nút "Từ chối" (đỏ) - **DISABLED**
4. **Click vào các nút bị disable** → Alert hiển thị: "Bạn không có quyền..."

#### Test Case 4: User với role USER

1. **Đăng nhập với tài khoản USER**
2. **Vào trang "Chi tiết phiếu nhập kho"**
3. **Kiểm tra StatusSidebar:**
   - ❌ Tất cả nút đều **DISABLED**
   - ✅ Chỉ có thể xem thông tin

### Bước 3: Test với phiếu đã xử lý

1. **Vào trang "Chi tiết phiếu nhập kho"** với phiếu có status = "IMPORTED" hoặc "REJECTED"
2. **Kiểm tra StatusSidebar:**
   - ❌ Tất cả nút đều **DISABLED** (vì status không phải PENDING)
   - ✅ Chỉ hiển thị thông tin "Đã nhập bởi" hoặc "Từ chối bởi"

### Bước 4: Test Backend Endpoints

#### Test endpoint `/api/imports/{id}/reject`

```bash
# Sử dụng curl hoặc Postman
curl -X POST http://localhost:8080/api/imports/15/reject \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Kết quả mong đợi:**
- Status code: 200
- Response: `{ "success": true, "message": "Đã từ chối phiếu nhập", "data": {...} }`
- Status của phiếu: "REJECTED"

#### Test endpoint `/api/exports/{id}/reject`

```bash
curl -X POST http://localhost:8080/api/exports/15/reject \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

## 🔧 Cách Mock Roles để Test (Nếu Backend chưa có roles)

Nếu JWT token từ backend chưa có field `roles`, bạn có thể tạm thời mock trong frontend:

### Cách 1: Sửa tạm trong `useUser.ts`

```typescript
// src/hooks/useUser.ts
useEffect(() => {
    const token = getToken();
    if (!token) {
        setUser(null);
        setLoading(false);
        return;
    }

    try {
        const parts = token.split('.');
        if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            
            // ⚠️ MOCK ROLES ĐỂ TEST (XÓA SAU KHI BACKEND CÓ ROLES)
            const mockRoles = ['MANAGER']; // Thay đổi: 'ADMIN', 'MANAGER', 'STAFF', 'USER'
            
            setUser({
                username: payload.sub || payload.username || '',
                roles: payload.roles || payload.authorities || mockRoles, // Dùng mockRoles nếu không có
            });
        } else {
            setUser(null);
        }
    } catch (error) {
        console.error('Error decoding token:', error);
        setUser(null);
    } finally {
        setLoading(false);
    }
}, []);
```

### Cách 2: Test trực tiếp trong Console

```javascript
// Mở Console và chạy:
localStorage.setItem('test_roles', JSON.stringify(['ADMIN']));

// Sau đó sửa useUser.ts để đọc từ test_roles:
const testRoles = localStorage.getItem('test_roles');
if (testRoles) {
    setUser({
        username: 'test',
        roles: JSON.parse(testRoles),
    });
}
```

## ✅ Checklist Test

- [ ] JWT token có chứa roles
- [ ] ADMIN có thể thực hiện tất cả hành động
- [ ] MANAGER có thể duyệt và từ chối, nhưng không thể xóa
- [ ] STAFF không thể duyệt/từ chối/xóa
- [ ] USER chỉ có thể xem
- [ ] Nút bị disable hiển thị tooltip đúng
- [ ] Click nút không có quyền → Alert hiển thị
- [ ] Backend endpoint `/reject` hoạt động đúng
- [ ] Status phiếu cập nhật đúng sau khi duyệt/từ chối/hủy

## 🐛 Troubleshooting

### Lỗi: "Bạn không có quyền" ngay cả khi là ADMIN

**Nguyên nhân:** JWT token không có field `roles`

**Giải pháp:**
1. Kiểm tra token có chứa roles không (dùng jwt.io)
2. Nếu không có, mock roles tạm thời như hướng dẫn trên
3. Hoặc yêu cầu backend thêm roles vào JWT token

### Lỗi: Endpoint `/reject` trả về 404

**Nguyên nhân:** Backend chưa có endpoint này

**Giải pháp:**
1. Đảm bảo đã build lại backend
2. Kiểm tra log backend xem endpoint có được đăng ký không
3. Restart Docker container nếu cần

### Lỗi: Nút không disable khi không có quyền

**Nguyên nhân:** `useUser` hook không lấy được roles

**Giải pháp:**
1. Kiểm tra Console có lỗi không
2. Kiểm tra token có hợp lệ không
3. Thêm console.log để debug:
   ```typescript
   console.log('User roles:', userRoles);
   console.log('Can approve:', canApprove);
   ```

## 📝 Ghi chú

- Phân quyền chỉ kiểm tra ở **frontend**, backend cũng cần implement phân quyền riêng để bảo mật
- Hiện tại hệ thống decode roles từ JWT token, nếu backend không trả về roles trong token thì cần mock tạm thời
- Các quyền có thể được điều chỉnh trong file `src/lib/permissions.ts`

