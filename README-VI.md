# Hệ thống Quản lý Kho hàng

Ứng dụng quản lý kho hàng được xây dựng với Next.js 16, React 19, TypeScript và Tailwind CSS.

## Cấu trúc dự án

```
app/
├── components/
│   ├── Header.tsx          # Header với logo và thông báo
│   ├── Sidebar.tsx         # Menu điều hướng bên trái
│   ├── StatCard.tsx        # Card hiển thị thống kê
│   ├── PieChart.tsx        # Biểu đồ tròn
│   └── TimeFilter.tsx      # Bộ lọc thời gian (Ngày/Tuần/Tháng/Năm)
├── globals.css             # CSS toàn cục
├── layout.tsx              # Layout chính
└── page.tsx                # Trang chủ - Dashboard
```

## Tính năng

### Dashboard Tổng quan
- Biểu đồ tỉ lệ xuất - nhập kho
- Thống kê tổng số phiếu
- Thống kê tổng lượng tồn kho

### Quản lý Xuất kho
- Biểu đồ tỉ lệ xuất kho theo nguồn nhận
- Số phiếu xuất kho
- Tổng lượng xuất kho

### Quản lý Nhập kho
- Biểu đồ tỉ lệ nhập kho theo nguồn xuất
- Số phiếu nhập kho
- Tổng lượng nhập kho

### Menu điều hướng
- Xuất - nhập với NCC
- Xuất - nhập với Nội bộ
- Xuất - nhập với NVBH
- Quản lý kiểm kê
- Báo cáo thống kê
- Danh mục

## Chạy dự án

```bash
# Cài đặt dependencies
npm install

# Chạy development server
npm run dev

# Build production
npm run build

# Chạy production server
npm start
```

Mở [http://localhost:3000](http://localhost:3000) để xem ứng dụng.

## Công nghệ sử dụng

- **Next.js 16** - React framework
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling
- **SVG** - Icons và biểu đồ

## Tùy chỉnh

### Màu sắc
Các màu chính được định nghĩa trong `app/globals.css`:
- `--blue-primary: #0046ff` - Màu xanh chính
- `--blue-secondary: #0b08ab` - Màu xanh phụ
- `--teal: #07b4a9` - Màu xanh ngọc
- `--teal-light: #05b6aa` - Màu xanh ngọc nhạt

### Components
Tất cả components đều có thể tái sử dụng và tùy chỉnh thông qua props.
