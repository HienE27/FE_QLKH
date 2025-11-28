# Tối ưu hiệu năng - Performance Optimizations

## ✅ Đã tối ưu

### 1. **Dashboard Page (`dashboard/page.tsx`)**
- ✅ **Batch API calls**: Gộp `loadDashboardData()` và `loadAiAlerts()` vào `Promise.all()` để chạy song song
- ✅ **useCallback**: Memoize `loadDashboardData`, `loadAiAlerts`, và `getIconDisplay` để tránh re-create functions
- ✅ **Dependencies**: Sửa dependencies của `useEffect` để tránh re-render không cần thiết

### 2. **AI Feature Panels (`AiFeaturePanels.tsx`)**
- ✅ **useCallback**: Memoize `fetchTrend` function
- ✅ **Dependencies**: Sửa `useEffect` để re-fetch khi `trendPeriod` thay đổi thay vì chỉ chạy 1 lần
- ✅ **Dynamic imports**: `html2canvas`, `jspdf`, `xlsx` chỉ load khi cần (giảm bundle size ban đầu ~500KB+)

### 3. **Import/Export Report Pages (`import-report/page.tsx`, `export-report/page.tsx`)**
- ✅ **Batch API calls**: Gộp tất cả API calls (getSupplierImports/Exports, getInternalImports/Exports, getStaffImports/Exports, getSuppliers) vào 1 `Promise.all()` thay vì gọi riêng lẻ → **Giảm từ 4 API calls xuống 1 batch call**
- ✅ **useCallback**: Memoize `loadData`, `fetchSuppliers`, `applySorting` functions
- ✅ **useMemo**: Memoize `sortedData` và `statistics` để tránh tính toán lại mỗi render
- ✅ **Dependencies**: Sửa dependencies của `useEffect` để tránh re-render không cần thiết
- ✅ **Removed debug logs**: Xóa console.log trong production code

### 4. **Import/Export Receipts Pages (`import-receipts/page.tsx`, `export-receipts/page.tsx`)**
- ✅ **Batch API calls**: Gộp `fetchSuppliers()` và `loadImports()`/`fetchExports()` vào `Promise.all()`
- ✅ **useCallback**: Memoize tất cả async functions và handlers
- ✅ **useMemo**: Memoize `sortedData`, `supplierMap` để tránh tính toán lại
- ✅ **Optimized sorting**: Dùng `useMemo` cho sorted data thay vì sort trực tiếp trên state

## 🔍 Các vấn đề có thể gây lag

### 1. **Bundle Size**
- `html2canvas` và `jspdf` là các thư viện nặng (~500KB+)
- **Giải pháp**: Chỉ import khi cần (dynamic import)

### 2. **Re-renders không cần thiết**
- Các component lớn có thể re-render khi parent state thay đổi
- **Giải pháp**: Sử dụng `React.memo()` cho các component con

### 3. **Heavy computations**
- Filter/reduce operations trên arrays lớn
- **Giải pháp**: Sử dụng `useMemo` cho các tính toán nặng

### 4. **API calls**
- Quá nhiều API calls đồng thời
- **Giải pháp**: Batch requests, thêm caching

### 5. **Images/Assets**
- Large images không được optimize
- **Giải pháp**: Sử dụng Next.js Image component với optimization

## 📋 Đề xuất tối ưu thêm

### 1. **Dynamic Imports cho Heavy Libraries**
```typescript
// Thay vì import trực tiếp
const downloadReport = async (format: 'PDF') => {
  const { default: jsPDF } = await import('jspdf');
  const html2canvas = (await import('html2canvas')).default;
  // ...
}
```

### 2. **React.memo cho Components**
```typescript
export default React.memo(AiFeaturePanels);
```

### 3. **Debounce cho Search/Filter**
```typescript
import { useDebouncedCallback } from 'use-debounce';

const debouncedSearch = useDebouncedCallback(
  (value: string) => {
    // search logic
  },
  300
);
```

### 4. **Virtual Scrolling cho Large Lists**
- Sử dụng `react-window` hoặc `react-virtualized` cho danh sách dài

### 5. **Code Splitting**
```typescript
// Lazy load components
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
  ssr: false
});
```

### 6. **Caching API Responses**
- Sử dụng React Query hoặc SWR để cache API responses
- Giảm số lượng API calls không cần thiết

### 7. **Optimize Images**
```typescript
import Image from 'next/image';

<Image
  src="/image.jpg"
  width={500}
  height={300}
  alt="Description"
  loading="lazy"
/>
```

## 🚀 Quick Wins

1. **Kiểm tra Network tab**: Xem API calls nào chậm nhất
2. **React DevTools Profiler**: Tìm components re-render nhiều nhất
3. **Lighthouse**: Chạy performance audit
4. **Bundle Analyzer**: Kiểm tra bundle size
   ```bash
   npm install @next/bundle-analyzer
   ```

## 📊 Monitoring

- Sử dụng `web-vitals` để monitor performance metrics
- Track Core Web Vitals: LCP, FID, CLS

