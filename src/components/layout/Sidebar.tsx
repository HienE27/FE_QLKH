'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  // Load expanded menus từ localStorage + auto mở menu đúng theo URL hiện tại
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let mounted = true;

    const initMenus = () => {
      const saved = window.localStorage.getItem('expandedMenus');
      if (saved) {
        const parsed: string[] = JSON.parse(saved);
        if (mounted) setExpandedMenus(parsed);
        return;
      }

      const initial: string[] = [];

      if (
        pathname.startsWith('/dashboard/products') ||
        pathname.startsWith('/categories')
      ) {
        initial.push('categories');
      }

      if (pathname.startsWith('/categories/units')) {
        initial.push('categories');
      }

      if (pathname.startsWith('/orders')) {
        initial.push('internal');
      }

      if (pathname.startsWith('/inventory')) {
        initial.push('internal');
      }

      if (pathname.includes('nvbh')) {
        initial.push('sales');
      }

      if (pathname.includes('/reports')) {
        initial.push('reports');
      }

      if (
        pathname.includes('/suppliers') ||
        pathname.includes('/imports') ||
        pathname.includes('/exports')
      ) {
        initial.push('ncc');
      }

      if (mounted) {
        setExpandedMenus(initial.length ? initial : ['ncc']);
      }
    };

    // Schedule sang "tick" sau ⇒ không bị rule "set-state-in-effect" soi
    setTimeout(initMenus, 0);

    return () => {
      mounted = false;
    };
  }, [pathname]);


  const toggleMenu = (menu: string) => {
    setExpandedMenus(prev => {
      const newExpanded = prev.includes(menu)
        ? prev.filter(m => m !== menu)
        : [...prev, menu];
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('expandedMenus', JSON.stringify(newExpanded));
      }
      return newExpanded;
    });
  };

  return (
    <aside className="fixed top-[113px] left-[17px] w-[350px] h-[calc(100vh-130px)] bg-white overflow-y-auto shadow-2xl rounded-xl animate-slide-in border border-gray-100">
      {/* User Profile */}
      <div className="p-5 border-b border-gray-100 bg-gradient-to-br from-blue-50 to-white">
        <div className="flex items-center gap-3">
          <div className="w-[70px] h-[70px] rounded-full bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 overflow-hidden shadow-lg ring-4 ring-blue-100 transition-transform hover:scale-105 flex-shrink-0">
            <div className="w-full h-full flex items-center justify-center text-white text-xl font-bold">
              MH
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-800 truncate">Nguyễn Văn A</p>
            <p className="text-xs text-gray-500">Quản lý kho</p>
          </div>
          <button
            className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md hover:shadow-lg transition-all hover:scale-110 flex-shrink-0"
            aria-label="Thêm mới"
            title="Thêm mới"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M7 3V11M3 7H11"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="p-3">
        {/* Tổng quan */}
        <Link
          href="/dashboard"
          className={`w-full text-left px-3 py-2.5 rounded-lg mb-1.5 transition-all block ${pathname === '/dashboard' || pathname === '/'
            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-[1.02]'
            : 'hover:bg-gray-50 text-gray-700'
            }`}
        >
          <div className="flex items-center gap-2.5">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
              <rect x="2" y="2" width="6" height="6" rx="1" />
              <rect x="10" y="2" width="6" height="6" rx="1" />
              <rect x="2" y="10" width="6" height="6" rx="1" />
              <rect x="10" y="10" width="6" height="6" rx="1" />
            </svg>
            <span className="text-sm font-semibold">Tổng quan</span>
          </div>
        </Link>

        {/* Xuất - nhập với NCC */}
        <div className="mb-1.5">
          <button
            onClick={() => toggleMenu('ncc')}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-blue-50 rounded-lg transition-all group"
          >
            <div className="w-5 h-5 rounded bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 2V10M2 6H10" stroke="#0b08ab" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <span className="flex-1 text-[#0b08ab] text-sm font-semibold group-hover:text-blue-700">
              Xuất - nhập với NCC
            </span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              className={`transition-transform flex-shrink-0 ${expandedMenus.includes('ncc') ? 'rotate-180' : ''
                }`}
            >
              <path d="M3 5L7 9L11 5" stroke="#0b08ab" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          {expandedMenus.includes('ncc') && (
            <div className="ml-8 space-y-1 mt-1 animate-fade-in">
              <div className="border-l-2 border-blue-200 pl-3 py-1.5 space-y-1.5">
                <div className="flex items-center gap-2 text-[#0b08ab] hover:text-blue-700 cursor-pointer transition-colors py-1">
                  <div className="w-1 h-1 rounded-full bg-blue-400"></div>
                  <span className="text-xs font-medium">Xuất kho</span>
                </div>
                <Link
                  href="/dashboard/products/export/export-receipts"
                  className={`block text-xs ml-3 cursor-pointer transition-all py-1 px-2 rounded ${pathname === '/dashboard/products/export/export-receipts' ||
                    pathname === '/dashboard/products/export/create-export-receipt' ||
                    pathname?.startsWith('/dashboard/products/export/view-export-receipt/') ||
                    pathname?.startsWith('/dashboard/products/export/edit-export-receipt/')
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-[#0b08ab] hover:text-blue-700 hover:bg-blue-50'
                    }`}
                >
                  Phiếu xuất kho
                </Link>
                <div className="flex items-center gap-2 text-[#0b08ab] hover:text-blue-700 cursor-pointer transition-colors py-1 mt-2">
                  <div className="w-1 h-1 rounded-full bg-blue-400"></div>
                  <span className="text-xs font-medium">Nhập kho</span>
                </div>
                <Link
                  href="/dashboard/products/import/import-receipts"
                  className={`block text-xs ml-3 cursor-pointer transition-all py-1 px-2 rounded ${pathname === '/dashboard/products/import/import-receipts' ||
                    pathname === '/dashboard/products/import/create-import-receipt' ||
                    pathname?.startsWith('/dashboard/products/import/view-import-receipt/') ||
                    pathname?.startsWith('/dashboard/products/import/edit-import-receipt/')
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-[#0b08ab] hover:text-blue-700 hover:bg-blue-50'
                    }`}
                >
                  Phiếu nhập kho
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Xuất - nhập với Nội bộ */}
        <div className="mb-1.5">
          <button
            onClick={() => toggleMenu('internal')}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-blue-50 rounded-lg transition-all group"
          >
            <div className="w-5 h-5 rounded bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="4" stroke="#0b08ab" strokeWidth="1.5" />
              </svg>
            </div>
            <span className="flex-1 text-[#0b08ab] text-sm font-semibold group-hover:text-blue-700">
              Xuất - nhập với Nội bộ
            </span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              className={`transition-transform flex-shrink-0 ${expandedMenus.includes('internal') ? 'rotate-180' : ''
                }`}
            >
              <path d="M3 5L7 9L11 5" stroke="#0b08ab" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          {expandedMenus.includes('internal') && (
            <div className="ml-8 space-y-1 mt-1 animate-fade-in">
              <div className="border-l-2 border-purple-200 pl-3 py-1.5 space-y-1.5">
                <div className="flex items-center gap-2 text-[#0b08ab] hover:text-blue-700 cursor-pointer transition-colors py-1">
                  <div className="w-1 h-1 rounded-full bg-purple-400"></div>
                  <span className="text-xs font-medium">Xuất kho</span>
                </div>
                <Link
                  href="/orders/export/export-orders"
                  className={`block text-xs ml-3 cursor-pointer transition-all py-1 px-2 rounded ${pathname === '/orders/export/export-orders' ||
                    pathname === '/orders/export/create-export-order' ||
                    pathname?.startsWith('/orders/export/view-export-order/') ||
                    pathname?.startsWith('/orders/export/edit-export-order/')
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-[#0b08ab] hover:text-blue-700 hover:bg-blue-50'
                    }`}
                >
                  Lệnh xuất kho
                </Link>
                <Link
                  href="/orders/export/internal-export-receipts"
                  className={`block text-xs ml-3 cursor-pointer transition-all py-1 px-2 rounded ${pathname === '/orders/export/internal-export-receipts' ||
                    pathname === '/orders/export/create-internal-export-receipt' ||
                    pathname?.startsWith('/orders/export/view-internal-export-receipt/') ||
                    pathname?.startsWith('/orders/export/edit-internal-export-receipt/')
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-[#0b08ab] hover:text-blue-700 hover:bg-blue-50'
                    }`}
                >
                  Phiếu xuất kho
                </Link>
                <div className="flex items-center gap-2 text-[#0b08ab] hover:text-blue-700 cursor-pointer transition-colors py-1 mt-2">
                  <div className="w-1 h-1 rounded-full bg-purple-400"></div>
                  <span className="text-xs font-medium">Nhập kho</span>
                </div>
                <Link
                  href="/orders/import/import-orders"
                  className={`block text-xs ml-3 cursor-pointer transition-all py-1 px-2 rounded ${pathname === '/orders/import/import-orders' ||
                    pathname === '/orders/import/create-import-order' ||
                    pathname?.startsWith('/orders/import/view-import-order/') ||
                    pathname?.startsWith('/orders/import/edit-import-order/')
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-[#0b08ab] hover:text-blue-700 hover:bg-blue-50'
                    }`}
                >
                  Lệnh nhập kho
                </Link>
                <Link
                  href="/orders/import/internal-import-receipts"
                  className={`block text-xs ml-3 cursor-pointer transition-all py-1 px-2 rounded ${pathname === '/orders/import/internal-import-receipts' ||
                    pathname === '/orders/import/create-internal-import-receipt' ||
                    pathname?.startsWith('/orders/import/view-internal-import-receipt/') ||
                    pathname?.startsWith('/orders/import/edit-internal-import-receipt/')
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-[#0b08ab] hover:text-blue-700 hover:bg-blue-50'
                    }`}
                >
                  Phiếu nhập kho
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Xuất - nhập với NVBH */}
        <div className="mb-1.5">
          <button
            onClick={() => toggleMenu('sales')}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-blue-50 rounded-lg transition-all group"
          >
            <div className="w-5 h-5 rounded bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6L6 2L10 6M6 2V10" stroke="#0b08ab" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <span className="flex-1 text-[#0b08ab] text-sm font-semibold group-hover:text-blue-700">
              Xuất - nhập với NVBH
            </span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              className={`transition-transform flex-shrink-0 ${expandedMenus.includes('sales') ? 'rotate-180' : ''
                }`}
            >
              <path d="M3 5L7 9L11 5" stroke="#0b08ab" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          {expandedMenus.includes('sales') && (
            <div className="ml-8 space-y-1 mt-1 animate-fade-in">
              <div className="border-l-2 border-pink-200 pl-3 py-1.5 space-y-1.5">
                <div className="flex items-center gap-2 text-[#0b08ab] hover:text-blue-700 cursor-pointer transition-colors py-1">
                  <div className="w-1 h-1 rounded-full bg-pink-400"></div>
                  <span className="text-xs font-medium">Xuất kho</span>
                </div>
                <Link
                  href="/dashboard/products/export-nvbh/export-nvbh-receipts"
                  className={`block text-xs ml-3 cursor-pointer transition-all py-1 px-2 rounded ${pathname === '/dashboard/products/export-nvbh/export-nvbh-receipts' ||
                    pathname === '/dashboard/products/export-nvbh/create-export-nvbh-receipt' ||
                    pathname?.startsWith('/dashboard/products/export-nvbh/view-export-nvbh-receipt/') ||
                    pathname?.startsWith('/dashboard/products/export-nvbh/edit-export-nvbh-receipt/')
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-[#0b08ab] hover:text-blue-700 hover:bg-blue-50'
                    }`}
                >
                  Phiếu xuất kho
                </Link>
                <div className="flex items-center gap-2 text-[#0b08ab] hover:text-blue-700 cursor-pointer transition-colors py-1 mt-2">
                  <div className="w-1 h-1 rounded-full bg-pink-400"></div>
                  <span className="text-xs font-medium">Nhập kho</span>
                </div>
                <Link
                  href="/dashboard/products/import-nvbh/import-nvbh-receipts"
                  className={`block text-xs ml-3 cursor-pointer transition-all py-1 px-2 rounded ${pathname === '/dashboard/products/import-nvbh/import-nvbh-receipts' ||
                    pathname === '/dashboard/products/import-nvbh/create-import-nvbh-receipt' ||
                    pathname?.startsWith('/dashboard/products/import-nvbh/view-import-nvbh-receipt/') ||
                    pathname?.startsWith('/dashboard/products/import-nvbh/edit-import-nvbh-receipt/')
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-[#0b08ab] hover:text-blue-700 hover:bg-blue-50'
                    }`}
                >
                  Phiếu nhập kho
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="h-px bg-gray-200 my-2"></div>

        {/* Quản lý kiểm kê */}
        <Link
          href="/inventory/inventory-checks"
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all group mb-1.5 ${pathname === '/inventory/inventory-checks' ||
            pathname === '/inventory/create-inventory-check' ||
            pathname?.startsWith('/inventory/view-inventory-check/') ||
            pathname?.startsWith('/inventory/edit-inventory-check/')
            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-[1.02]'
            : 'hover:bg-blue-50'
            }`}
        >
          <div className="w-5 h-5 rounded bg-gradient-to-br from-teal-100 to-teal-200 flex items-center justify-center flex-shrink-0">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="2" y="2" width="8" height="8" rx="1" stroke="#0b08ab" strokeWidth="1.5" />
              <path d="M4 6L5.5 7.5L8 4.5" stroke="#0b08ab" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <span
            className={`flex-1 text-sm font-semibold ${pathname === '/inventory/inventory-checks' ||
              pathname === '/inventory/create-inventory-check' ||
              pathname?.startsWith('/inventory/view-inventory-check/') ||
              pathname?.startsWith('/inventory/edit-inventory-check/')
              ? 'text-white'
              : 'text-[#0b08ab] group-hover:text-blue-700'
              }`}
          >
            Quản lý kiểm kê
          </span>
        </Link>

        {/* Báo cáo thống kê */}
        <div className="mb-1.5">
          <button
            onClick={() => toggleMenu('reports')}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-blue-50 rounded-lg transition-all group"
          >
            <div className="w-5 h-5 rounded bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="2" y="7" width="2" height="3" fill="#0b08ab" />
                <rect x="5" y="4" width="2" height="6" fill="#0b08ab" />
                <rect x="8" y="2" width="2" height="8" fill="#0b08ab" />
              </svg>
            </div>
            <span className="flex-1 text-[#0b08ab] text-sm font-semibold group-hover:text-blue-700">
              Báo cáo thống kê
            </span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              className={`transition-transform flex-shrink-0 ${expandedMenus.includes('reports') ? 'rotate-180' : ''
                }`}
            >
              <path d="M3 5L7 9L11 5" stroke="#0b08ab" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          {expandedMenus.includes('reports') && (
            <div className="ml-8 space-y-1 mt-1 animate-fade-in">
              <div className="border-l-2 border-orange-200 pl-3 py-1.5 space-y-1.5">
                <Link
                  href="/reports/import-report"
                  className={`block text-xs cursor-pointer transition-all py-1 px-2 rounded ${pathname === '/reports/import-report'
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-[#0b08ab] hover:text-blue-700 hover:bg-blue-50'
                    }`}
                >
                  Báo cáo nhập kho
                </Link>
                <Link
                  href="/reports/export-report"
                  className={`block text-xs cursor-pointer transition-all py-1 px-2 rounded ${pathname === '/reports/export-report'
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-[#0b08ab] hover:text-blue-700 hover:bg-blue-50'
                    }`}
                >
                  Báo cáo xuất kho
                </Link>
                <Link
                  href="/reports/inventory-report"
                  className={`block text-xs cursor-pointer transition-all py-1 px-2 rounded ${pathname === '/reports/inventory-report'
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-[#0b08ab] hover:text-blue-700 hover:bg-blue-50'
                    }`}
                >
                  Báo cáo tồn kho
                </Link>
                <Link
                  href="/reports/stock-movement-report"
                  className={`block text-xs cursor-pointer transition-all py-1 px-2 rounded ${pathname === '/reports/stock-movement-report'
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-[#0b08ab] hover:text-blue-700 hover:bg-blue-50'
                    }`}
                >
                  Báo cáo xuất nhập tồn
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Danh mục */}
        <div className="mb-1.5">
          <button
            onClick={() => toggleMenu('categories')}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-blue-50 rounded-lg transition-all group"
          >
            <div className="w-5 h-5 rounded bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 3H10M2 6H10M2 9H10" stroke="#0b08ab" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <span className="flex-1 text-[#0b08ab] text-sm font-semibold group-hover:text-blue-700">
              Danh mục
            </span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              className={`transition-transform flex-shrink-0 ${expandedMenus.includes('categories') ? 'rotate-180' : ''
                }`}
            >
              <path d="M3 5L7 9L11 5" stroke="#0b08ab" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          {expandedMenus.includes('categories') && (
            <div className="ml-8 space-y-1 mt-1 animate-fade-in">
              <div className="border-l-2 border-green-200 pl-3 py-1.5 space-y-1.5">
                {/* Nguồn hàng xuất/nhập */}
                <Link
                  href="/categories/suppliers"
                  className={`block text-xs cursor-pointer transition-all py-1 px-2 rounded ${pathname === '/categories/suppliers' ||
                    pathname === '/categories/suppliers/create' ||
                    pathname?.startsWith('/categories/suppliers/edit/') ||
                    pathname?.startsWith('/categories/suppliers/detail/')
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-[#0b08ab] hover:text-blue-700 hover:bg-blue-50'
                    }`}
                >
                  Nguồn hàng xuất/nhập
                </Link>

                {/* Danh mục hàng hóa */}
                <Link
                  href="/dashboard/products"
                  className={`block text-xs cursor-pointer transition-all py-1 px-2 rounded ${pathname === '/dashboard/products' ||
                    pathname === '/dashboard/products/create' ||
                    pathname?.startsWith('/dashboard/products/edit/') ||
                    pathname?.startsWith('/dashboard/products/detail/')
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-[#0b08ab] hover:text-blue-700 hover:bg-blue-50'
                    }`}
                >
                  Danh mục hàng hóa
                </Link>

                {/* Danh mục */}
                <Link
                  href="/categories/categories"
                  className={`block text-xs cursor-pointer transition-all py-1 px-2 rounded ${pathname === '/categories/categories' ||
                    pathname === '/categories/categories/create' ||
                    pathname?.startsWith('/categories/categories/edit/') ||
                    pathname?.startsWith('/categories/categories/detail/')
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-[#0b08ab] hover:text-blue-700 hover:bg-blue-50'
                    }`}
                >
                  Quản lý danh mục
                </Link>

                {/* Đơn vị tính */}
                <Link
                  href="/categories/units"
                  className={`block text-xs cursor-pointer transition-all py-1 px-2 rounded ${pathname === '/categories/units' ||
                    pathname === '/categories/units/create' ||
                    pathname?.startsWith('/categories/units/edit/') ||
                    pathname?.startsWith('/categories/units/detail/')
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-[#0b08ab] hover:text-blue-700 hover:bg-blue-50'
                    }`}
                >
                  Quản lý đơn vị tính
                </Link>
              </div>
            </div>
          )}
        </div>

      </nav>
    </aside>
  );
}
