# Báo Cáo Tối Ưu Toàn Diện

## 📋 Tổng Quan
Báo cáo này phân tích các file không sử dụng, code duplicate, và các điểm có thể tái sử dụng.

---

## 🔍 So Sánh TimeFilter.tsx và utils.ts

### **Sự Khác Biệt Cơ Bản:**

| Tiêu chí | TimeFilter.tsx | utils.ts |
|----------|----------------|----------|
| **Loại** | React Component (UI) | Utility Functions (Pure) |
| **Có UI?** | ✅ Có (4 buttons) | ❌ Không |
| **Có State?** | ✅ Có (selected value) | ❌ Không |
| **Input** | User click buttons | Function parameters |
| **Output** | `'day' \| 'week' \| 'month' \| 'year'` | Formatted string |
| **Mục đích** | User chọn time period | Format/parse data |

### **Tại Sao TimeFilter.tsx Không Được Dùng:**

1. **Các trang hiện tại dùng Date Picker:**
   - TimeFilter: Quick buttons ("Ngày", "Tuần", "Tháng", "Năm") - chọn khoảng thời gian tương đối
   - Hiện tại: Date inputs (`<input type="date">`) - chọn ngày cụ thể, linh hoạt hơn

2. **FilterSection đã có date inputs tích hợp:**
   - Tất cả trang đều dùng `FilterSection` với "Từ ngày" và "Đến ngày"
   - Không cần thêm TimeFilter buttons

3. **Use case khác nhau:**
   - TimeFilter phù hợp: Dashboard charts, Analytics với quick filters
   - Hiện tại: Cần filter linh hoạt với ngày cụ thể

**Kết luận:** TimeFilter.tsx và utils.ts **hoàn toàn khác nhau** - không liên quan đến nhau.

---

## 🗑️ Files Không Sử Dụng

### 1. **TimeFilter.tsx** (53 dòng)
- **Chức năng:** UI component với 4 buttons để chọn time period
- **Lý do không dùng:** Các trang dùng date picker thay vì quick filters
- **Khuyến nghị:** Xóa hoặc giữ lại nếu muốn thêm quick filters cho dashboard

### 2. **StatCard.tsx** (45 dòng)
- **Chức năng:** Reusable stat card component với icon
- **Lý do không dùng:** Các trang tự render stat cards với HTML/CSS riêng
- **Khuyến nghị:** Xóa hoặc sử dụng để thống nhất UI

### 3. **AiAssistant.tsx** (320 dòng)
- **Chức năng:** AI chat assistant component
- **Lý do không dùng:** Tính năng chưa được tích hợp vào dashboard
- **Khuyến nghị:** Xóa hoặc tích hợp vào dashboard nếu muốn dùng

### 4. **AiFeaturePanels.tsx** (448 dòng)
- **Chức năng:** AI features panels (Sales Trend, Report Generation, Combo Suggestions)
- **Lý do không dùng:** Logic đã được tích hợp trực tiếp vào `/reports` page
- **Khuyến nghị:** Xóa (logic đã có trong reports page)

**Tổng:** ~866 dòng code có thể xóa

---

## 🔄 Code Duplicate Có Thể Tái Sử Dụng

### 1. **parseNumber Function** ⚠️

**Vấn đề:** 6 files tự định nghĩa `parseNumber` thay vì dùng từ `utils.ts`:

```typescript
// Duplicate trong 6 files:
const parseNumber = (value: string): number => {
    const cleaned = value.replace(/[^\d]/g, '');
    return cleaned ? Number(cleaned) : 0;
};
```

**Files cần refactor:**
- `inventory/edit-inventory-check/[id]/page.tsx`
- `inventory/create-inventory-check/page.tsx`
- `dashboard/products/export/create-export-receipt/page.tsx`
- `dashboard/products/import/create-import-receipt/page.tsx`
- `dashboard/products/create/page.tsx` ✅ (đã dùng `parseMoney` từ utils.ts)
- `dashboard/products/edit/[id]/page.tsx` ✅ (đã dùng `parseMoney` từ utils.ts)

**Giải pháp:** Thay thế bằng `parseNumber` từ `@/lib/utils`

**Lưu ý:** 
- `utils.ts` có `parseNumber` nhận `string | number | null | undefined`
- Các file hiện tại chỉ nhận `string`
- Cần kiểm tra compatibility trước khi refactor

---

### 2. **formatCurrency Function** ⚠️

**Vấn đề:** 8 files vẫn tự định nghĩa `formatCurrency`:

```typescript
// Duplicate trong 8 files:
const formatCurrency = (value: number) =>
    value.toLocaleString('vi-VN', { maximumFractionDigits: 0 });
```

**Files cần refactor:**
- `dashboard/page.tsx`
- `reports/page.tsx`
- `reports/demand-forecast/page.tsx`
- `inventory/edit-inventory-check/[id]/page.tsx`
- `inventory/create-inventory-check/page.tsx`
- `dashboard/products/export/create-export-receipt/page.tsx`
- `dashboard/products/import/create-import-receipt/page.tsx`
- `inventory/view-inventory-check/[id]/page.tsx`

**Giải pháp:** Thay thế bằng `formatPrice` từ `@/lib/utils`

**Lưu ý:**
- `utils.ts` có cả `formatCurrency` và `formatPrice`
- `formatCurrency`: Chỉ nhận `number`
- `formatPrice`: Nhận `number | null | undefined`
- Nên dùng `formatPrice` vì linh hoạt hơn

---

### 3. **formatDateTime Function** ⚠️

**Vấn đề:** 6 files tự định nghĩa `formatDateTime` với logic khác nhau:

**Files:**
- `dashboard/products/export/export-receipts/page.tsx` ✅ (đã refactor)
- `reports/import-report/page.tsx` ✅ (đã refactor)
- `reports/export-report/page.tsx` ✅ (đã refactor)
- `inventory/view-inventory-check/[id]/page.tsx`
- `dashboard/products/import/view-import-receipt/[id]/page.tsx`
- `dashboard/products/export/view-export-receipt/[id]/page.tsx`

**Giải pháp:** Thay thế bằng `formatDateTime` từ `@/lib/utils`

**Lưu ý:** Một số file có format khác (ví dụ: `HH:mm:ss DD/MM/YYYY`), cần kiểm tra kỹ.

---

## 📊 Thống Kê

### Files có thể xóa:
- **4 files** không sử dụng
- **~866 dòng** code

### Code duplicate:
- **parseNumber:** 6 files (có thể refactor)
- **formatCurrency:** 8 files (có thể refactor)
- **formatDateTime:** 3 files còn lại (có thể refactor)

### Code đã được tái sử dụng:
- ✅ `usePagination` hook - 13+ files
- ✅ `formatPrice` - 6 files đã refactor
- ✅ `formatDateTime` - 3 files đã refactor
- ✅ `parseMoney` - 2 files đã dùng từ utils.ts

---

## ✅ Khuyến Nghị Hành Động

### Ưu tiên cao:
1. **Xóa 4 files không sử dụng** (~866 dòng)
2. **Refactor parseNumber** trong 6 files → dùng từ `utils.ts`
3. **Refactor formatCurrency** trong 8 files → dùng `formatPrice` từ `utils.ts`

### Ưu tiên trung bình:
1. **Refactor formatDateTime** trong 3 files còn lại
2. **Sử dụng useFilterReset hook** cho 9 files có filter reset logic

### Ưu tiên thấp:
1. **Kiểm tra và xóa unused imports**
2. **Document các patterns đang sử dụng**

---

## 🎯 Kết Luận

### Điểm mạnh:
- ✅ `usePagination` hook đã được tích hợp thành công
- ✅ Một số files đã dùng utilities từ `utils.ts`
- ✅ Code structure khá tốt

### Điểm cần cải thiện:
- ❌ 4 files không sử dụng (866 dòng)
- ⚠️ 14 files có code duplicate (parseNumber, formatCurrency)
- ⚠️ 3 files có formatDateTime duplicate

### Tổng kết:
- **Code có thể xóa:** ~866 dòng
- **Code có thể refactor:** ~200-300 dòng duplicate
- **Files có thể xóa:** 4 files
- **Files cần refactor:** 14 files

