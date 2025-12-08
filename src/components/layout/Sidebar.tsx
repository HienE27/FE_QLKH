'use client';

import { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearToken } from '@/lib/auth';
import { getProfile, type UserProfile } from '@/services/auth.service';
import {
  HomeIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  Squares2X2Icon,
  ClipboardDocumentCheckIcon,
  ChartBarIcon,
  UserCircleIcon,
} from '@heroicons/react/24/solid';

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

  const exactMatch = patterns.some(pattern => {
    if (!pattern) return false;
    if (pattern === '/dashboard') {
      return pathname === '/' || pathname === '/dashboard';
    }
    if (!pattern.includes('*') && !pattern.endsWith('/')) {
      return pathname === pattern;
    }
    return false;
  });

  if (exactMatch) return true;

  return patterns.some(pattern => {
    if (!pattern) return false;
    if (pattern.endsWith('/*')) {
      const basePath = pattern.slice(0, -2);
      if (pathname === basePath) return true;
      if (pathname.startsWith(basePath + '/')) {
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
    icon: <HomeIcon className="w-5 h-5" />,
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
    icon: <ArrowDownTrayIcon className="w-5 h-5" />,
    links: [
      {
        label: 'Phiếu nhập kho',
        href: '/imports',
        matches: [
          '/imports',
          '/imports/create',
          '/imports/view/',
          '/imports/edit/',
        ],
      },
    ],
  },
  {
    id: 'export',
    label: 'Phiếu xuất kho',
    icon: <ArrowUpTrayIcon className="w-5 h-5" />,
    links: [
      {
        label: 'Phiếu xuất kho',
        href: '/exports',
        matches: [
          '/exports',
          '/exports/create',
          '/exports/view/',
          '/exports/edit/',
        ],
      },
    ],
  },
  {
    id: 'categories',
    label: 'Danh mục',
    icon: <Squares2X2Icon className="w-5 h-5" />,
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
        href: '/products',
        matches: [
          '/products',
          '/products/create',
          '/products/edit/',
          '/products/detail/',
        ],
      },
      {
        label: 'Quản lý danh mục',
        href: '/categories/product-categories',
        matches: [
          '/categories/product-categories',
          '/categories/product-categories/create',
          '/categories/product-categories/edit/',
          '/categories/product-categories/detail/',
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
    icon: <ClipboardDocumentCheckIcon className="w-5 h-5" />,
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
    icon: <ChartBarIcon className="w-5 h-5" />,
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
      {
        label: 'Báo cáo phiếu xuất',
        href: '/reports/export-report',
        matches: ['/reports/export-report'],
      },
      {
        label: 'Báo cáo phiếu nhập',
        href: '/reports/import-report',
        matches: ['/reports/import-report'],
      },
    ],
    isExpandable: true,
  },
  {
    id: 'profile',
    label: 'Hồ sơ',
    icon: <UserCircleIcon className="w-5 h-5" />,
    links: [
      {
        label: 'Hồ sơ người dùng',
        href: '/profile',
        matches: ['/profile'],
      },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

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

      if (pathname.startsWith('/reports') && !initial.includes('reports')) {
        initial.push('reports');
      }

      const updatedParsed = [...parsed];
      if (pathname.startsWith('/reports') && !updatedParsed.includes('reports')) {
        updatedParsed.push('reports');
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('expandedSections', JSON.stringify(updatedParsed));
        }
      }

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

  useEffect(() => {
    const loadUserProfile = async () => {
      // Check cache first for instant display
      if (typeof window !== 'undefined') {
        const cachedProfile = sessionStorage.getItem('userProfile');
        if (cachedProfile) {
          try {
            const profile = JSON.parse(cachedProfile);
            setUserProfile(profile);
            setLoadingProfile(false);
            
            // Fetch fresh data in background to update cache
            try {
              const freshProfile = await getProfile();
              sessionStorage.setItem('userProfile', JSON.stringify(freshProfile));
              setUserProfile(freshProfile);
            } catch (error) {
              // Silent fail - keep cached data
              console.error('Failed to refresh user profile:', error);
            }
            return;
          } catch (error) {
            // Invalid cache, clear it
            sessionStorage.removeItem('userProfile');
          }
        }
      }

      // No cache, fetch fresh data
      try {
        setLoadingProfile(true);
        const profile = await getProfile();
        setUserProfile(profile);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('userProfile', JSON.stringify(profile));
        }
      } catch (error) {
        console.error('Failed to load user profile:', error);
        setUserProfile(null);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadUserProfile();
  }, []);

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

    if (allLinksInSection) {
      const otherExactMatch = allLinksInSection.some(otherLink => {
        if (otherLink.href === link.href) return false;
        const otherPatterns = otherLink.matches ?? [otherLink.href];
        return otherPatterns.some(pattern => {
          if (!pattern || pattern.includes('*') || pattern.endsWith('/')) return false;
          if (pattern === '/dashboard') {
            return pathname === '/' || pathname === '/dashboard';
          }
          return pathname === pattern;
        });
      });
      if (otherExactMatch) return false;
    }

    return matchPath(pathname, patterns);
  };

  const handleLogout = () => {
    clearToken();
    router.push('/login');
  };

  return (
    <aside className="hidden xl:flex fixed bg-white shadow-sm w-72 h-[calc(100vh-32px)] my-4 ml-4 rounded-xl border border-blue-gray-100 flex-col">
      {/* Logo */}
      <div className="py-6 px-8 border-b border-blue-gray-100">
        <Link
          href="/dashboard"
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 bg-[#0099FF] rounded-lg flex items-center justify-center shadow-md">
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white">
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="text-lg font-bold text-blue-gray-800">
            Quản lý kho
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto">
        <div className="m-4">
          {navSections.map((section, index) => {
            const isExpanded = expandedSections.includes(section.id);
            const hasSubLinks = section.links.length > 1;
            const showDivider =
              (section.id === 'categories' && index > 0) ||
              section.id === 'categories';

            if (hasSubLinks && section.isExpandable) {
              return (
                <ul key={section.id} className="mb-4 flex flex-col gap-1">
                  {showDivider && (
                    <li className="mx-3.5 mt-4 mb-2">
                      <div className="h-px w-full bg-blue-gray-100" />
                    </li>
                  )}
                  <li>
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-blue-gray-50 transition-all text-blue-gray-700"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-5 h-5 text-blue-gray-500">
                          {section.icon}
                        </div>
                        <span className="text-sm font-medium capitalize">
                          {section.label}
                        </span>
                      </div>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        className={`text-blue-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
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
                  </li>
                  <div
                    className={`overflow-hidden transition-all ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
                  >
                    <div className="ml-9 space-y-1">
                      {section.links.map(link => {
                        const linkActive = isLinkActive(link, section.links);
                        return (
                          <li key={link.href}>
                            <Link
                              href={link.href}
                              className={`block px-4 py-2 rounded-lg transition-all text-sm capitalize ${linkActive
                                ? 'bg-[#0099FF] text-white font-medium shadow-md'
                                : 'text-blue-gray-600 hover:bg-blue-gray-50 hover:text-blue-gray-800'
                                }`}
                            >
                              {link.label}
                            </Link>
                          </li>
                        );
                      })}
                    </div>
                  </div>
                </ul>
              );
            }

            // Single link
            return (
              <ul key={section.id} className="mb-4 flex flex-col gap-1">
                {showDivider && (
                  <li className="mx-3.5 mt-4 mb-2">
                    <div className="h-px w-full bg-blue-gray-100" />
                  </li>
                )}
                {section.links.map(link => {
                  const linkActive = isLinkActive(link, section.links);
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all capitalize ${linkActive
                          ? 'bg-[#0099FF] text-white font-medium shadow-md'
                          : 'text-blue-gray-700 hover:bg-blue-gray-50'
                          }`}
                      >
                        <div className="w-5 h-5">
                          {section.icon}
                        </div>
                        <span className="text-sm font-medium">
                          {link.label}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            );
          })}
        </div>
      </div>

      {/* User Section */}
      <div className="p-4 border-t border-blue-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#0099FF] flex items-center justify-center text-white text-sm font-bold shadow-md">
            {loadingProfile ? (
              <span className="animate-pulse">...</span>
            ) : (
              (userProfile?.fullName || userProfile?.username || 'U')
                .split(' ')
                .filter(Boolean)
                .map(part => part[0]?.toUpperCase())
                .join('')
                .slice(0, 2)
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-blue-gray-800 truncate">
              {loadingProfile ? (
                <span className="animate-pulse text-gray-400">Đang tải...</span>
              ) : (
                userProfile?.fullName || userProfile?.username || 'Người dùng'
              )}
            </p>
            <p className="text-xs text-blue-gray-500 truncate">
              {loadingProfile ? (
                <span className="animate-pulse text-gray-400">...</span>
              ) : (
                userProfile?.email || 'Chưa có email'
              )}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-8 h-8 flex items-center justify-center text-blue-gray-500 hover:text-blue-gray-700 transition-all rounded-lg hover:bg-blue-gray-50"
            title="Đăng xuất"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
