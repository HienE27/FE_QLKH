// src/components/settings/CompanyInfo.tsx
'use client';

import { useSettings } from '@/hooks/useSettings';

/**
 * Component hiển thị thông tin công ty từ Settings
 * Có thể dùng ở Footer, About page, hoặc bất kỳ đâu
 */
export default function CompanyInfo() {
  const { settings, loading } = useSettings([
    'company_name',
    'company_address',
    'company_phone',
    'company_email',
    'company_website',
  ]);

  if (loading) {
    return <div className="text-sm text-gray-500">Đang tải...</div>;
  }

  return (
    <div className="space-y-2 text-sm text-gray-600">
      {settings.company_name && (
        <div className="font-semibold text-gray-900">{settings.company_name}</div>
      )}
      {settings.company_address && (
        <div>📍 {settings.company_address}</div>
      )}
      {settings.company_phone && (
        <div>📞 {settings.company_phone}</div>
      )}
      {settings.company_email && (
        <div>✉️ {settings.company_email}</div>
      )}
      {settings.company_website && (
        <div>
          🌐{' '}
          <a
            href={settings.company_website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {settings.company_website}
          </a>
        </div>
      )}
    </div>
  );
}

