# Hướng dẫn Test - Tối ưu getAllStock() với React Query

## ✅ Đã hoàn thành
- Tạo hook `useAllStocks()` với React Query caching
- Thay thế `getAllStock()` trong 8 files
- Không có lỗi linter

## 🚀 Cách test nhanh

### 1. Start ứng dụng
```bash
cd FE_QLKH
npm run dev
```

### 2. Test cơ bản (5 phút)

#### Test 1: Dashboard
1. Mở `http://localhost:3000/dashboard`
2. Mở **DevTools → Network tab**
3. Kiểm tra:
   - ✅ Có request đến `/api/stocks/paged?page=0&size=100`
   - ✅ Dashboard hiển thị đúng số liệu (tồn kho, giá trị, v.v.)
   - ✅ Không có lỗi trong Console

#### Test 2: Products Page (Test Cache)
1. Từ Dashboard, click vào **"Sản phẩm"**
2. Kiểm tra Network tab:
   - ✅ **KHÔNG** có request mới đến `/api/stocks/paged` (đã cache)
   - ✅ Tồn kho hiển thị đúng cho từng sản phẩm

#### Test 3: Import Create (Test Cache)
1. Click vào **"Tạo phiếu nhập"**
2. Kiểm tra Network tab:
   - ✅ **KHÔNG** có request mới đến stocks (đã cache)
   - ✅ Thêm sản phẩm → Tồn kho hiển thị đúng

### 3. Test nâng cao (10 phút)

#### Test Multiple Pages
- Nếu có > 100 stocks, kiểm tra Network:
  - ✅ Request đến `page=0`, `page=1`, `page=2`, ... (tự động fetch tất cả)

#### Test Cache Expiry
1. Mở Dashboard → Đợi 5 phút
2. Mở Products page → Kiểm tra Network:
   - ✅ Có request mới (cache đã stale sau 5 phút)

#### Test Error Handling
1. Tắt backend
2. Mở Dashboard → Kiểm tra:
   - ✅ App không crash
   - ✅ Hiển thị error gracefully
   - ✅ Tự động retry (2 lần)

## 📋 Checklist nhanh

- [ ] Dashboard load đúng số liệu
- [ ] Products page không gọi API stocks mới (cache)
- [ ] Import/Export pages không gọi API stocks mới (cache)
- [ ] Tồn kho hiển thị đúng ở tất cả pages
- [ ] Không có lỗi trong Console
- [ ] Network tab: Chỉ 1 lần fetch stocks (sau đó cache)

## 🐛 Troubleshooting

### Lỗi: "Cannot read property 'forEach' of undefined"
- **Fix**: Đã thêm `= []` trong destructuring → Không còn lỗi

### Lỗi: "getAllStockPaged is not a function"
- **Nguyên nhân**: Backend chưa có endpoint `/api/stocks/paged`
- **Fix**: Kiểm tra backend có endpoint này chưa (đã tạo ở phần trước)

### Stocks không được cache
- **Nguyên nhân**: React Query chưa setup
- **Fix**: Kiểm tra `QueryClientProvider` trong `app/(dashboard)/layout.tsx`

## ✅ Kết quả mong đợi

Sau khi test thành công:
- ✅ Tất cả pages load nhanh hơn (do cache)
- ✅ Giảm số lượng requests đến API stocks
- ✅ Data nhất quán giữa các pages
- ✅ UX tốt hơn (không phải đợi load stocks mỗi lần)

