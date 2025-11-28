'use client';

import { useRouter } from 'next/navigation';
import { clearToken } from '@/lib/auth';
import { useSetting } from '@/hooks/useSettings';

export default function Header() {
  const router = useRouter();
  const { value: companyName } = useSetting('company_name', 'Công ty ABC');

  const handleLogout = () => {
    clearToken();
    router.push('/login');
  };

  return (
    <header className="fixed top-0 left-0 w-full h-[98px] bg-gradient-to-r from-[#0046ff] to-[#0b08ab] z-50 shadow-xl">
      <div className="flex items-center justify-between px-8 h-full">
        {/* Logo + tên công ty */}
        <div className="flex items-center gap-3 group">
          <div className="relative">
            <svg
              width="28"
              height="36"
              viewBox="0 0 21 30"
              fill="none"
              className="drop-shadow-lg transition-transform group-hover:scale-110"
            >
              <path
                d="M10.5 0L0 7.5V22.5L10.5 30L21 22.5V7.5L10.5 0Z"
                fill="#FFCF55"
              />
              <path
                d="M10.5 6L4 10.5V19.5L10.5 24L17 19.5V10.5L10.5 6Z"
                fill="#FFA500"
                opacity="0.6"
              />
            </svg>
            <div className="absolute inset-0 bg-yellow-300 blur-xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
          </div>
          <span className="text-white text-xl font-semibold tracking-wide">
            {companyName}
          </span>
        </div>

        {/* Khu vực bên phải: chuông + avatar + logout */}
        <div className="flex items-center gap-4">
          <button
            className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-all group"
            aria-label="Thông báo"
            title="Thông báo"
            suppressHydrationWarning
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="white"
              className="group-hover:scale-110 transition-transform"
            >
              <path d="M12 22C10.9 22 10 21.1 10 20H14C14 21.1 13.1 22 12 22ZM18 16V11C18 7.93 16.36 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.63 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16Z" />
            </svg>
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
          </button>

          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold shadow-lg cursor-pointer hover:scale-110 transition-transform">
            MH
          </div>

          <button
            onClick={handleLogout}
            className="px-3 py-1 rounded-full bg-white/10 text-white text-sm border border-white/30 hover:bg-white hover:text-[#0b08ab] transition-colors"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </header>
  );
}
