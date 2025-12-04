'use client';

import { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearToken } from '@/lib/auth';

type NavLinkItem = {
  label: string;
  href: string;
  matches?: string[];
  icon?: ReactNode;
  badge?: number;
};

type NavSection = {
  id: string;
  label: string;
  icon: ReactNode;
  links: NavLinkItem[];
  isExpandable?: boolean;
};

const matchPath = (pathname: string, patterns: string[] = []) => {
  if (!patterns.length) return false;

  // Ưu tiên exact match trước
  const exactMatch = patterns.some(pattern => {
    if (!pattern) return false;
    if (pattern === '/dashboard') {
      return pathname === '/' || pathname === '/dashboard';
    }
    // Exact match (không có wildcard)
    if (!pattern.includes('*') && !pattern.endsWith('/')) {
      return pathname === pattern;
    }
    return false;
  });

  if (exactMatch) return true;

  // Sau đó mới check wildcard patterns
  return patterns.some(pattern => {
    if (!pattern) return false;
    // Xử lý pattern với wildcard
    if (pattern.endsWith('/*')) {
      const basePath = pattern.slice(0, -2); // Bỏ '/*'
      // Chỉ match nếu pathname bắt đầu bằng basePath + '/'
      // nhưng không match các exact paths đã được định nghĩa riêng
      if (pathname === basePath) return true;
      if (pathname.startsWith(basePath + '/')) {
        // Kiểm tra xem có phải là exact path đã được định nghĩa riêng không
        // Nếu có, thì không match wildcard này
        return true;
      }
      return false;
    }
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
    id: 'dashboard',
    label: 'Tổng quát',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    links: [
      {
        label: 'Tổng quát',
        href: '/dashboard',
        matches: ['/dashboard'],
      },
    ],
  },
  {
    id: 'import',
    label: 'Phiếu nhập kho',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 17l4 4 4-4M12 21V3" />
      </svg>
    ),
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
  {
    id: 'export',
    label: 'Phiếu xuất kho',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 7l4-4 4 4M12 3v18" />
      </svg>
    ),
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
    id: 'categories',
    label: 'Danh mục',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
    links: [
      {
        label: 'Nguồn hàng nhập',
        href: '/categories/suppliers',
        matches: [
          '/categories/suppliers',
          '/categories/suppliers/create',
          '/categories/suppliers/edit/',
          '/categories/suppliers/detail/',
        ],
      },
      {
        label: 'Khách hàng',
        href: '/categories/customers',
        matches: [
          '/categories/customers',
          '/categories/customers/create',
          '/categories/customers/edit/',
          '/categories/customers/detail/',
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
      {
        label: 'Kho hàng',
        href: '/categories/stores',
        matches: [
          '/categories/stores',
          '/categories/stores/create',
          '/categories/stores/edit/',
        ],
      },
    ],
    isExpandable: true,
  },
  {
    id: 'inventory',
    label: 'Kiểm kê kho',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
    links: [
      {
        label: 'Kiểm kê kho',
        href: '/inventory/inventory-checks',
        matches: [
          '/inventory/inventory-checks',
          '/inventory/create-inventory-check',
          '/inventory/view-inventory-check/',
          '/inventory/edit-inventory-check/',
        ],
      },
    ],
  },
  {
    id: 'reports',
    label: 'Báo cáo AI',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
    links: [
      {
        label: 'Báo cáo AI thông minh',
        href: '/reports',
        matches: ['/reports', '/reports/*'],
      },
      {
        label: 'Báo cáo tồn kho',
        href: '/reports/inventory-report',
        matches: ['/reports/inventory-report'],
      },
    ],
    isExpandable: true,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let mounted = true;

    const initSections = () => {
      const saved = window.localStorage.getItem('expandedSections');
      const parsed: string[] = saved ? JSON.parse(saved) : [];

      const initial: string[] = [];

      navSections.forEach(section => {
        const isActive = section.links.some(link =>
          matchPath(pathname, link.matches ?? [link.href])
        );
        if (isActive && section.isExpandable) {
          initial.push(section.id);
        }
      });

      // Tự động mở menu "Báo cáo AI" nếu đang ở trang reports
      if (pathname.startsWith('/reports') && !initial.includes('reports')) {
        initial.push('reports');
      }

      // Nếu đang ở trang reports nhưng menu chưa mở trong localStorage, thì mở nó
      const updatedParsed = [...parsed];
      if (pathname.startsWith('/reports') && !updatedParsed.includes('reports')) {
        updatedParsed.push('reports');
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('expandedSections', JSON.stringify(updatedParsed));
        }
      }

      // Merge initial với updatedParsed, ưu tiên initial
      const final = [...new Set([...initial, ...updatedParsed])];

      if (mounted) {
        setExpandedSections(final);
      }
    };

    setTimeout(initSections, 0);

    return () => {
      mounted = false;
    };
  }, [pathname]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newExpanded = prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId];
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('expandedSections', JSON.stringify(newExpanded));
      }
      return newExpanded;
    });
  };

  const isLinkActive = (link: NavLinkItem, allLinksInSection?: NavLinkItem[]) => {
    const patterns = link.matches ?? [link.href];

    // Ưu tiên exact match của chính link này trước
    const exactPatterns = patterns.filter(p => !p.includes('*') && !p.endsWith('/'));
    if (exactPatterns.length > 0) {
      const exactMatch = exactPatterns.some(pattern => {
        if (pattern === '/dashboard') {
          return pathname === '/' || pathname === '/dashboard';
        }
        return pathname === pattern;
      });
      if (exactMatch) return true;
    }

    // Nếu có exact match từ link khác trong cùng section, thì không match wildcard
    if (allLinksInSection) {
      const otherExactMatch = allLinksInSection.some(otherLink => {
        if (otherLink.href === link.href) return false; // Bỏ qua chính nó
        const otherPatterns = otherLink.matches ?? [otherLink.href];
        return otherPatterns.some(pattern => {
          if (!pattern || pattern.includes('*') || pattern.endsWith('/')) return false;
          if (pattern === '/dashboard') {
            return pathname === '/' || pathname === '/dashboard';
          }
          return pathname === pattern;
        });
      });
      if (otherExactMatch) return false; // Có exact match khác, không match wildcard này
    }

    // Sau đó mới check wildcard patterns
    return matchPath(pathname, patterns);
  };

  const isSectionActive = (section: NavSection) => {
    // Đối với section có expandable, chỉ active khi có child link active
    // nhưng không highlight parent button nếu đang ở trang child
    if (section.isExpandable) {
      return false; // Không highlight parent button cho expandable sections
    }
    return section.links.some(link => isLinkActive(link, section.links));
  };

  const handleLogout = () => {
    clearToken();
    router.push('/login');
  };

  const filteredSections = navSections.filter(section => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      section.label.toLowerCase().includes(query) ||
      section.links.some(link => link.label.toLowerCase().includes(query))
    );
  });

  return (
    <aside className="fixed top-0 left-0 w-[240px] h-screen flex flex-col bg-white rounded-lg border border-[#09244b33] overflow-hidden z-40">
      {/* Window Controls */}
      <div className="absolute top-4 left-4 flex gap-2 z-10">
        <div className="w-3 h-3 bg-[#ff6252] rounded-full border border-[#0000001a]" />
        <div className="w-3 h-3 bg-[#fdad15] rounded-full border border-[#0000001a]" />
        <div className="w-3 h-3 bg-[#2ac670] rounded-full border border-[#0000001a]" />
      </div>

      {/* Logo */}
      <div className="absolute top-[52px] left-[30px] flex items-center gap-2.5 z-10">
        <div className="w-6 h-6 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
            <path
              d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="#09244b"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span
          className="text-lg font-medium text-[#09244b] leading-6"
          style={{ fontFamily: 'PingFang SC, sans-serif' }}
        >
          Quản lý kho
        </span>
      </div>

      {/* Navigation List */}
      <nav className="flex flex-col gap-2 px-4 pt-24 pb-20 flex-1 overflow-y-auto">
        {/* Search Box */}
        <div className="group flex items-center gap-3 px-4 py-2.5 bg-[#f2f4f6] rounded-lg shadow-[inset_0_1px_0_#00000005,inset_0_-1px_0_#ffffff33] mb-2 transition-all duration-300 hover:bg-[#e8ebef] focus-within:bg-white focus-within:shadow-md focus-within:ring-2 focus-within:ring-[#007AFF]/20">
          <div className="w-5 h-5 flex items-center justify-center text-[#b5bdc9] flex-shrink-0 transition-colors duration-300 group-focus-within:text-[#007AFF]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full transition-transform duration-300 group-focus-within:scale-110">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>

          </div>
          <input
            type="text"
            placeholder="Tìm Kiếm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm text-[#b5bdc9] placeholder:text-[#b5bdc9] min-w-0 transition-colors duration-300 focus:text-[#526581]"
            style={{ fontFamily: 'PingFang SC, sans-serif', fontSize: '14px', lineHeight: '20px' }}
          />
        </div>

        {filteredSections.map((section, index) => {
          const isActive = isSectionActive(section);
          const isExpanded = expandedSections.includes(section.id);
          const hasSubLinks = section.links.length > 1;

          // Add divider after "Phiếu xuất kho" (export section) and before "Danh mục" (categories section)
          const showDivider = section.id === 'categories' && index > 0;

          if (hasSubLinks && section.isExpandable) {
            return (
              <div key={section.id} className="w-full">
                {showDivider && (
                  <div className="flex items-center justify-center py-2 mb-2">
                    <div className="w-[172px] h-px bg-[#f2f4f6]" />
                  </div>
                )}
                <button
                  onClick={() => toggleSection(section.id)}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg transition-all duration-300 ease-in-out ${isExpanded && isSectionActive(section)
                    ? 'bg-[#f2f4f6] text-[#526581]'
                    : 'bg-white text-[#526581] hover:bg-[#f2f4f6] hover:shadow-sm'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 flex items-center justify-center text-current flex-shrink-0 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                      {section.icon}
                    </div>
                    <span
                      className="text-sm font-medium whitespace-nowrap transition-colors duration-300"
                      style={{ fontFamily: 'PingFang SC, sans-serif', fontSize: '14px', lineHeight: '20px' }}
                    >
                      {section.label}
                    </span>
                  </div>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    className={`text-current transition-transform duration-300 ease-in-out flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                  >
                    <path
                      d="M4 6l4 4 4-4"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0'
                    }`}
                >
                  <div className="ml-11 space-y-1">
                    {section.links.map(link => {
                      const linkActive = isLinkActive(link, section.links);
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          className={`block px-3 py-2 rounded-lg transition-all duration-300 ease-in-out transform hover:translate-x-1 ${linkActive
                            ? 'bg-[#007AFF] text-white font-medium shadow-sm'
                            : 'text-[#526581] hover:bg-[#f2f4f6] font-normal'
                            }`}
                          style={{ fontFamily: 'PingFang SC, sans-serif', fontSize: '14px', lineHeight: '20px' }}
                        >
                          {link.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          }

          // Single link
          return (
            <div key={section.id} className="w-full">
              {showDivider && (
                <div className="flex items-center justify-center py-2 mb-2">
                  <div className="w-[172px] h-px bg-[#f2f4f6]" />
                </div>
              )}
              {section.links.map(link => {
                const linkActive = isLinkActive(link, section.links);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-[1.02] ${linkActive
                      ? 'bg-[#007AFF] text-white shadow-md'
                      : 'bg-white text-[#526581] hover:bg-[#f2f4f6] hover:shadow-sm'
                      }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-5 h-5 flex items-center justify-center text-current flex-shrink-0 transition-transform duration-300 ${linkActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                        {section.icon}
                      </div>
                      <span
                        className="text-sm font-medium whitespace-nowrap transition-colors duration-300"
                        style={{ fontFamily: 'PingFang SC, sans-serif', fontSize: '14px', lineHeight: '20px' }}
                      >
                        {link.label}
                      </span>
                    </div>
                    {link.badge && (
                      <div className="flex items-center justify-center px-1.5 py-0.5 bg-[#f2f4f6] rounded-[10px] flex-shrink-0 transition-all duration-300 hover:scale-110">
                        <span
                          className="text-xs font-medium text-[#b5bdc9] transition-colors duration-300"
                          style={{ fontFamily: 'PingFang SC, sans-serif', fontSize: '12px', lineHeight: '18px' }}
                        >
                          {link.badge}
                        </span>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="absolute bottom-0 left-0 right-0 p-5 bg-white rounded-b-lg border-t border-[#f2f4f6]">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 transition-transform duration-300 hover:scale-110 hover:shadow-lg">
            MH
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-medium text-[#09244b] truncate"
              style={{ fontFamily: 'PingFang SC, sans-serif', fontSize: '14px', lineHeight: '20px' }}
            >
              Nguyễn Văn A
            </p>
            <p
              className="text-xs text-[#8491a5] truncate"
              style={{ fontFamily: 'PingFang SC, sans-serif', fontSize: '12px', lineHeight: '18px' }}
            >
              admin@warehouse.com
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-5 h-5 flex items-center justify-center text-[#8491a5] hover:text-[#526581] transition-all duration-300 flex-shrink-0 hover:scale-110 hover:rotate-12"
            title="Đăng xuất"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
