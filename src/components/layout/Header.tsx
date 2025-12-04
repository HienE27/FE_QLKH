'use client';

import { useRouter } from 'next/navigation';
import { clearToken } from '@/lib/auth';

export default function Header() {
  const router = useRouter();

  const handleLogout = () => {
    clearToken();
    router.push('/login');
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-[70px] z-50 bg-white border-b border-blue-200 shadow-sm">
      <div className="relative flex items-center justify-between px-6 lg:px-10 h-full ml-[329px]">
        {/* Title */}
        <div className="flex items-center">
          <div className="relative">
            <h1
              className="text-[26px] lg:text-[30px] font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent tracking-tight leading-tight"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              Quản lý kho hàng
            </h1>
            <div className="absolute -bottom-1 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-300 to-transparent opacity-60" />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2.5 lg:gap-3 pr-4">
          {/* Notification Button */}
          <button
            className="relative w-11 h-11 flex items-center justify-center rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all duration-200 group border border-blue-100"
            aria-label="Thông báo"
            title="Thông báo"
            suppressHydrationWarning
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="transition-transform duration-200 group-hover:scale-110"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse ring-2 ring-white" />
          </button>

          {/* User Avatar */}
          <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold cursor-pointer hover:from-blue-600 hover:to-blue-700 shadow-md transition-all duration-200">
            MH
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </header>
  );
}
