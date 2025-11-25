// src/app/(dashboard)/layout.tsx
'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600">
        Đang kiểm tra phiên đăng nhập...
      </div>
    );
  }

  return <>{children}</>;
}
