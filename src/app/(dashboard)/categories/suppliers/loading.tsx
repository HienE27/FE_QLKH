export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#0099FF] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-blue-gray-600">Đang tải dữ liệu...</p>
      </div>
    </div>
  );
}

