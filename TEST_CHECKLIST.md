# Checklist Test - Tối ưu getAllStock() với React Query

## ✅ Đã hoàn thành
- Tạo hook `useAllStocks()` với React Query caching
- Thay thế `getAllStock()` trong 8 files:
  1. ✅ dashboard/page.tsx
  2. ✅ products/page.tsx
  3. ✅ imports/create/page.tsx
  4. ✅ imports/edit/[id]/page.tsx
  5. ✅ exports/create/page.tsx
  6. ✅ exports/edit/[id]/page.tsx
  7. ✅ exports/view/[id]/page.tsx
  8. ✅ reports/inventory-report/page.tsx

## 🧪 Các bước test

### 1. Test Dashboard Page (`/dashboard`)
- [ ] Mở trang Dashboard
- [ ] Kiểm tra console: Không có lỗi
- [ ] Kiểm tra Network tab: Chỉ có 1 request đến `/api/stocks/paged?page=0&size=100` (hoặc nhiều pages nếu có > 100 stocks)
- [ ] Kiểm tra các số liệu hiển thị đúng:
  - [ ] Tổng sản phẩm
  - [ ] Giá trị tồn kho
  - [ ] Số lượng sắp hết hàng
  - [ ] Số lượng hết hàng
- [ ] Refresh trang: Request stocks chỉ gọi lại sau 5 phút (cache)

### 2. Test Products Page (`/products`)
- [ ] Mở trang Products
- [ ] Kiểm tra console: Không có lỗi
- [ ] Kiểm tra Network tab: Request stocks được cache (nếu đã load từ Dashboard)
- [ ] Kiểm tra tồn kho hiển thị đúng cho từng sản phẩm
- [ ] Click vào sản phẩm để xem chi tiết tồn kho theo từng kho
- [ ] Navigate sang page khác rồi quay lại: Stocks vẫn được cache

### 3. Test Import Create Page (`/imports/create`)
- [ ] Mở trang Tạo phiếu nhập
- [ ] Kiểm tra console: Không có lỗi
- [ ] Kiểm tra Network tab: Request stocks được cache
- [ ] Thêm sản phẩm vào phiếu nhập
- [ ] Kiểm tra "Tồn kho hiện tại" hiển thị đúng
- [ ] Kiểm tra "Tồn kho tối đa" và "Tồn kho tối thiểu" hiển thị đúng

### 4. Test Import Edit Page (`/imports/edit/[id]`)
- [ ] Mở trang Sửa phiếu nhập (chọn 1 phiếu nhập có sẵn)
- [ ] Kiểm tra console: Không có lỗi
- [ ] Kiểm tra Network tab: Request stocks được cache
- [ ] Kiểm tra tồn kho hiển thị đúng cho các sản phẩm trong phiếu

### 5. Test Export Create Page (`/exports/create`)
- [ ] Mở trang Tạo phiếu xuất
- [ ] Kiểm tra console: Không có lỗi
- [ ] Kiểm tra Network tab: Request stocks được cache
- [ ] Thêm sản phẩm vào phiếu xuất
- [ ] Kiểm tra "Tồn kho hiện tại" hiển thị đúng
- [ ] Kiểm tra validation: Không cho xuất quá số lượng tồn kho

### 6. Test Export Edit Page (`/exports/edit/[id]`)
- [ ] Mở trang Sửa phiếu xuất (chọn 1 phiếu xuất có sẵn)
- [ ] Kiểm tra console: Không có lỗi
- [ ] Kiểm tra Network tab: Request stocks được cache
- [ ] Kiểm tra tồn kho hiển thị đúng cho các sản phẩm trong phiếu

### 7. Test Export View Page (`/exports/view/[id]`)
- [ ] Mở trang Xem phiếu xuất (chọn 1 phiếu xuất có sẵn)
- [ ] Kiểm tra console: Không có lỗi
- [ ] Kiểm tra Network tab: Request stocks được cache
- [ ] Kiểm tra tồn kho hiển thị đúng trong bảng sản phẩm

### 8. Test Inventory Report Page (`/reports/inventory-report`)
- [ ] Mở trang Báo cáo tồn kho
- [ ] Kiểm tra console: Không có lỗi
- [ ] Kiểm tra Network tab: Request stocks được cache
- [ ] Kiểm tra danh sách sản phẩm với số lượng tồn kho đúng
- [ ] Test filter theo số lượng tồn kho
- [ ] Test sort theo số lượng tồn kho

## 🔍 Kiểm tra Performance

### Cache Behavior
- [ ] Mở Dashboard → Kiểm tra Network: Có request đến `/api/stocks/paged`
- [ ] Mở Products (không refresh) → Kiểm tra Network: **KHÔNG** có request mới đến stocks (đã cache)
- [ ] Đợi 5 phút → Mở Products → Kiểm tra Network: Có request mới (cache đã stale)

### Multiple Pages Fetch
- [ ] Nếu có > 100 stocks, kiểm tra Network tab:
  - [ ] Request đến `/api/stocks/paged?page=0&size=100`
  - [ ] Request đến `/api/stocks/paged?page=1&size=100` (nếu có)
  - [ ] Request đến `/api/stocks/paged?page=2&size=100` (nếu có)
  - [ ] Tất cả được fetch tự động

### Error Handling
- [ ] Tắt backend → Mở Dashboard → Kiểm tra: App không crash, hiển thị error gracefully
- [ ] Bật lại backend → Kiểm tra: Tự động retry (2 lần)

## 📊 So sánh trước/sau

### Trước khi tối ưu:
- Mỗi page gọi `getAllStock()` riêng → Nhiều requests trùng lặp
- Không có cache → Mỗi lần load page đều gọi API
- Limit 1000 records → Có thể thiếu dữ liệu

### Sau khi tối ưu:
- ✅ Tất cả pages dùng chung cache → Chỉ 1 lần fetch
- ✅ Cache 5 phút → Giảm số lần gọi API
- ✅ Tự động fetch tất cả pages → Không thiếu dữ liệu
- ✅ Background refetch → Data luôn fresh

## 🐛 Các lỗi cần chú ý

1. **Lỗi "Cannot read property 'forEach' of undefined"**
   - Nguyên nhân: `stockList` có thể undefined
   - Fix: Đã thêm `= []` trong destructuring

2. **Lỗi "useAllStocks is not defined"**
   - Nguyên nhân: Chưa import hook
   - Fix: Kiểm tra import statement

3. **Lỗi "getAllStockPaged is not a function"**
   - Nguyên nhân: Backend chưa có endpoint `/api/stocks/paged`
   - Fix: Kiểm tra backend có endpoint này chưa

4. **Stocks không được cache**
   - Nguyên nhân: React Query chưa được setup đúng
   - Fix: Kiểm tra QueryClientProvider

## ✅ Kết quả mong đợi

Sau khi test, bạn sẽ thấy:
- ✅ Tất cả pages load nhanh hơn (do cache)
- ✅ Giảm số lượng requests đến API stocks
- ✅ Data nhất quán giữa các pages
- ✅ Không có lỗi trong console
- ✅ UX tốt hơn (không phải đợi load stocks mỗi lần)

