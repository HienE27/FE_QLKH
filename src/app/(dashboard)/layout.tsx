// src/app/(dashboard)/layout.tsx
'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Sidebar from '@/components/layout/Sidebar';
import MobileMenu from '@/components/layout/MobileMenu';
import { QueryClientProvider } from '@/providers/QueryClientProvider';
import { ConfirmProvider } from '@/hooks/useConfirm';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';


export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const routesToPrefetch = [
      '/dashboard',
      '/products',
      '/imports',
      '/exports',
      '/categories/product-categories',
      '/reports/import-report',
      '/reports/export-report',
      '/reports/inventory-report',
      '/profile',
    ];

    const prefetchFn = (router as unknown as { prefetch?: (href: string) => Promise<void> }).prefetch;
    if (!prefetchFn) return;

    routesToPrefetch.forEach((route) => {
      try {
        // Không cần chờ; prefetch nền để vào nhanh hơn
        prefetchFn(route);
      } catch {
        // Bỏ qua lỗi prefetch (tùy môi trường có thể không hỗ trợ)
      }
    });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-400">
        Đang kiểm tra phiên đăng nhập...
      </div>
    );
  }

  return (
    <QueryClientProvider>
      <ErrorBoundary>
        <div className="min-h-screen bg-blue-gray-50/50">
          <Sidebar />
          <MobileMenu />
          <main className="p-4 xl:ml-80 pt-16 xl:pt-4">
            <ConfirmProvider>
              {children}
            </ConfirmProvider>
          </main>
        </div>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
