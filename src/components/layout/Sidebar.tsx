'use client';

import { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavLinkItem = {
  label: string;
  href: string;
  matches?: string[];
};

type NavGroup = {
  title?: string;
  colorClass: string;
  links: NavLinkItem[];
};

type NavSection = {
  id: string;
  label: string;
  icon: ReactNode;
  indicator: string;
  accentCircle: string;
  groups?: NavGroup[];
};

const matchPath = (pathname: string, patterns: string[] = []) => {
  if (!patterns.length) return false;
  return patterns.some(pattern => {
    if (!pattern) return false;
    const normalized = pattern.endsWith('*') ? pattern.slice(0, -1) : pattern;
    if (pattern === '/dashboard') {
      return pathname === '/' || pathname === '/dashboard';
    }
    if (pattern.endsWith('*') || normalized.endsWith('/')) {
      return pathname.startsWith(normalized);
    }
    return pathname === normalized;
  });
};

const navSections: NavSection[] = [
  {
    id: 'ncc',
    label: 'Xuất - nhập với NCC',
    indicator: 'from-blue-100 via-blue-50 to-transparent',
    accentCircle: 'from-blue-200 via-blue-300 to-blue-400',
    icon: (
      <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none">
        <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    groups: [
      {
        title: 'Xuất kho',
        colorClass: 'bg-blue-400',
        links: [
          {
            label: 'Phiếu xuất kho',
            href: '/dashboard/products/export/export-receipts',
            matches: [
              '/dashboard/products/export/export-receipts',
              '/dashboard/products/export/create-export-receipt',
              '/dashboard/products/export/view-export-receipt/',
              '/dashboard/products/export/edit-export-receipt/',
            ],
          },
        ],
      },
      {
        title: 'Nhập kho',
        colorClass: 'bg-blue-400',
        links: [
          {
            label: 'Phiếu nhập kho',
            href: '/dashboard/products/import/import-receipts',
            matches: [
              '/dashboard/products/import/import-receipts',
              '/dashboard/products/import/create-import-receipt',
              '/dashboard/products/import/view-import-receipt/',
              '/dashboard/products/import/edit-import-receipt/',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'internal',
    label: 'Xuất - nhập với Nội bộ',
    indicator: 'from-blue-100 via-blue-50 to-transparent',
    accentCircle: 'from-blue-300 via-blue-400 to-blue-500',
    icon: (
      <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
        <circle cx="8" cy="8" r="3" />
      </svg>
    ),
    groups: [
      {
        title: 'Xuất kho',
        colorClass: 'bg-blue-500',
        links: [
          {
            label: 'Lệnh xuất kho',
            href: '/orders/export/export-orders',
            matches: [
              '/orders/export/export-orders',
              '/orders/export/create-export-order',
              '/orders/export/view-export-order/',
              '/orders/export/edit-export-order/',
            ],
          },
          {
            label: 'Phiếu xuất kho',
            href: '/orders/export/internal-export-receipts',
            matches: [
              '/orders/export/internal-export-receipts',
              '/orders/export/create-internal-export-receipt',
              '/orders/export/view-internal-export-receipt/',
              '/orders/export/edit-internal-export-receipt/',
            ],
          },
        ],
      },
      {
        title: 'Nhập kho',
        colorClass: 'bg-blue-500',
        links: [
          {
            label: 'Lệnh nhập kho',
            href: '/orders/import/import-orders',
            matches: [
              '/orders/import/import-orders',
              '/orders/import/create-import-order',
              '/orders/import/view-import-order/',
              '/orders/import/edit-import-order/',
            ],
          },
          {
            label: 'Phiếu nhập kho',
            href: '/orders/import/internal-import-receipts',
            matches: [
              '/orders/import/internal-import-receipts',
              '/orders/import/create-internal-import-receipt',
              '/orders/import/view-internal-import-receipt/',
              '/orders/import/edit-internal-import-receipt/',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'sales',
    label: 'Xuất - nhập với NVBH',
    indicator: 'from-blue-100 via-blue-50 to-transparent',
    accentCircle: 'from-blue-400 via-blue-500 to-blue-600',
    icon: (
      <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none">
        <path d="M8 3l4 4-4 4M4 8h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    groups: [
      {
        title: 'Xuất kho',
        colorClass: 'bg-blue-500',
        links: [
          {
            label: 'Phiếu xuất kho',
            href: '/dashboard/products/export-nvbh/export-nvbh-receipts',
            matches: [
              '/dashboard/products/export-nvbh/export-nvbh-receipts',
              '/dashboard/products/export-nvbh/create-export-nvbh-receipt',
              '/dashboard/products/export-nvbh/view-export-nvbh-receipt/',
              '/dashboard/products/export-nvbh/edit-export-nvbh-receipt/',
            ],
          },
        ],
      },
      {
        title: 'Nhập kho',
        colorClass: 'bg-blue-500',
        links: [
          {
            label: 'Phiếu nhập kho',
            href: '/dashboard/products/import-nvbh/import-nvbh-receipts',
            matches: [
              '/dashboard/products/import-nvbh/import-nvbh-receipts',
              '/dashboard/products/import-nvbh/create-import-nvbh-receipt',
              '/dashboard/products/import-nvbh/view-import-nvbh-receipt/',
              '/dashboard/products/import-nvbh/edit-import-nvbh-receipt/',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'reports',
    label: 'Báo cáo thống kê',
    indicator: 'from-blue-100 via-blue-50 to-transparent',
    accentCircle: 'from-blue-300 via-blue-400 to-blue-500',
    icon: (
      <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
        <rect x="2" y="10" width="2.5" height="4" />
        <rect x="6" y="6" width="2.5" height="8" />
        <rect x="10" y="3" width="2.5" height="11" />
      </svg>
    ),
    groups: [
      {
        colorClass: 'bg-blue-400',
        links: [
          {
            label: 'Báo cáo nhập kho',
            href: '/reports/import-report',
            matches: ['/reports/import-report'],
          },
          {
            label: 'Báo cáo xuất kho',
            href: '/reports/export-report',
            matches: ['/reports/export-report'],
          },
          {
            label: 'Báo cáo tồn kho',
            href: '/reports/inventory-report',
            matches: ['/reports/inventory-report'],
          },
          {
            label: 'Báo cáo xuất nhập tồn',
            href: '/reports/stock-movement-report',
            matches: ['/reports/stock-movement-report'],
          },
        ],
      },
    ],
  },
  {
    id: 'categories',
    label: 'Danh mục',
    indicator: 'from-blue-100 via-blue-50 to-transparent',
    accentCircle: 'from-blue-300 via-blue-400 to-blue-500',
    icon: (
      <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none">
        <path d="M3 4h10M3 8h10M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    groups: [
      {
        colorClass: 'bg-blue-400',
        links: [
          {
            label: 'Nguồn hàng xuất/nhập',
            href: '/categories/suppliers',
            matches: [
              '/categories/suppliers',
              '/categories/suppliers/create',
              '/categories/suppliers/edit/',
              '/categories/suppliers/detail/',
            ],
          },
          {
            label: 'Danh mục hàng hóa',
            href: '/dashboard/products',
            matches: [
              '/dashboard/products',
              '/dashboard/products/create',
              '/dashboard/products/edit/',
              '/dashboard/products/detail/',
            ],
          },
          {
            label: 'Quản lý danh mục',
            href: '/categories/categories',
            matches: [
              '/categories/categories',
              '/categories/categories/create',
              '/categories/categories/edit/',
              '/categories/categories/detail/',
            ],
          },
          {
            label: 'Quản lý đơn vị tính',
            href: '/categories/units',
            matches: [
              '/categories/units',
              '/categories/units/create',
              '/categories/units/edit/',
              '/categories/units/detail/',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'settings',
    label: 'Hệ thống',
    indicator: 'from-blue-100 via-blue-50 to-transparent',
    accentCircle: 'from-blue-400 via-blue-500 to-blue-600',
    icon: (
      <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none">
        <path d="M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 2v1.5M8 12.5V14M3.5 8H2M14 8h-1.5M4.22 4.22l1.06 1.06M10.72 10.72l1.06 1.06M4.22 11.78l1.06-1.06M10.72 5.28l1.06-1.06" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    groups: [
      {
        colorClass: 'bg-blue-400',
        links: [
          {
            label: 'Cài đặt hệ thống',
            href: '/settings',
            matches: [
              '/settings',
              '/settings/create',
              '/settings/edit/',
            ],
          },
        ],
      },
    ],
  },
];

const quickLinks: NavLinkItem[] = [
  {
    label: 'Quản lý kiểm kê',
    href: '/inventory/inventory-checks',
    matches: [
      '/inventory/inventory-checks',
      '/inventory/create-inventory-check',
      '/inventory/view-inventory-check/',
      '/inventory/edit-inventory-check/',
    ],
  },
  {
    label: 'Trợ lý AI',
    href: '/ai',
    matches: ['/ai'],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

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

      if (pathname.startsWith('/orders') || pathname.startsWith('/inventory')) {
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

  const isActiveSection = (section: NavSection) => {
    if (!section.groups) return false;
    return section.groups.some(group =>
      group.links.some(link => matchPath(pathname, link.matches ?? [link.href]))
    );
  };

  const overviewActive = matchPath(pathname, ['/dashboard']);

  return (
    <aside className="fixed top-[100px] left-[24px] w-[320px] h-[calc(100vh-120px)] rounded-2xl bg-white/95 border border-slate-200/50 shadow-[0_8px_32px_rgba(0,0,0,0.06)] overflow-hidden text-slate-700 font-['Inter',sans-serif] backdrop-blur-md">
      {/* User Profile Section */}
      <div className="relative p-5 border-b border-slate-100/80">
        <div className="relative flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#1E40AF] flex items-center justify-center text-white text-sm font-semibold shadow-sm transition-transform hover:scale-105">
            MH
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1E293B] truncate leading-tight">Nguyễn Văn A</p>
            <p className="text-xs text-[#64748B] truncate mt-0.5 leading-tight">admin@warehouse.com</p>
          </div>
        </div>
      </div>

      <nav className="relative px-4 py-4 space-y-2 overflow-y-auto h-[calc(100%-120px)] custom-scrollbar scroll-smooth">
        <Link
          href="/dashboard"
          className={`group flex items-center gap-3.5 px-4 py-3 rounded-lg transition-all duration-200 relative ${
            overviewActive
              ? 'bg-blue-50/80 text-[#2563EB]'
              : 'text-[#475569] hover:bg-slate-50/60 hover:text-[#2563EB]'
            }`}
        >
          {overviewActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#2563EB] rounded-r-full" />
          )}
          <div className="w-5 h-5 flex items-center justify-center">
            <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
          </div>
          <span className={`flex-1 text-[14px] font-medium ${overviewActive ? 'text-[#2563EB]' : 'text-[#475569]'}`}>
            Tổng quan
          </span>
        </Link>

        <div className="space-y-1">
          {navSections.map(section => {
            const isExpanded = expandedMenus.includes(section.id);
            const sectionActive = isActiveSection(section);
            return (
              <div key={section.id} className="relative">
                <button
                  onClick={() => toggleMenu(section.id)}
                  className={`group w-full flex items-center gap-3.5 px-4 py-3 rounded-lg transition-all duration-200 text-left relative ${
                    sectionActive
                      ? 'bg-slate-50/60 text-[#2563EB]'
                      : 'hover:bg-slate-50/40 text-[#475569]'
                    }`}
                >
                  {sectionActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#2563EB] rounded-r-full" />
                  )}
                  <div className={`w-5 h-5 flex items-center justify-center transition-colors duration-200 ${
                    sectionActive ? 'text-[#2563EB]' : 'text-[#64748B] group-hover:text-[#2563EB]'
                  }`}>
                    {section.icon}
                  </div>
                  <span className={`flex-1 text-[14px] font-medium transition-colors duration-200 ${
                    sectionActive ? 'text-[#2563EB]' : 'text-[#475569] group-hover:text-[#2563EB]'
                  }`}>
                    {section.label}
                  </span>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 20 20"
                    className={`transition-all duration-200 ${
                      isExpanded 
                        ? 'rotate-180 text-[#2563EB]' 
                        : 'text-[#94A3B8] group-hover:text-[#2563EB]'
                    }`}
                  >
                    <path
                      d="M5 7.5L10 12.5L15 7.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </svg>
                </button>
                {isExpanded && section.groups && (
                  <div className="mt-1.5 space-y-1.5 pl-8 animate-fade-in border-l border-slate-100 ml-2">
                    {section.groups.map((group, idx) => (
                      <div key={group.title ?? idx} className="space-y-1">
                        {group.title && (
                          <div className="px-3 py-1.5 text-[11px] uppercase tracking-wider text-[#94A3B8] font-semibold">
                            {group.title}
                          </div>
                        )}
                        <div className="space-y-0.5">
                          {group.links.map(link => {
                            const active = matchPath(pathname, link.matches ?? [link.href]);
                            return (
                              <Link
                                key={link.label}
                                href={link.href}
                                className={`group/link flex items-center gap-3 px-3.5 py-2.5 text-[13px] rounded-md transition-all duration-200 relative ${
                                  active
                                    ? 'bg-blue-50/60 text-[#2563EB] font-medium'
                                    : 'text-[#64748B] hover:bg-slate-50/50 hover:text-[#2563EB]'
                                  }`}
                              >
                                {active && (
                                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#2563EB] rounded-r-full" />
                                )}
                                <span className="flex-1">{link.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="space-y-1.5 border-t border-slate-100/80 pt-4 mt-4">
          {quickLinks.map((link, index) => {
            const active = matchPath(pathname, link.matches ?? [link.href]);
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`group flex items-center gap-3.5 px-4 py-3 rounded-lg text-[14px] font-medium transition-all duration-200 relative ${
                  active
                    ? 'bg-blue-50/80 text-[#2563EB]'
                    : 'text-[#475569] hover:bg-slate-50/60 hover:text-[#2563EB]'
                  }`}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#2563EB] rounded-r-full" />
                )}
                <div className="w-5 h-5 flex items-center justify-center">
                  {index === 0 ? (
                    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
                      <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                      <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                    </svg>
                  )}
                </div>
                <span className={`flex-1 ${active ? 'text-[#2563EB]' : 'text-[#475569]'}`}>
                  {link.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
