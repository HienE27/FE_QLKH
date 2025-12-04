'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getDashboardAlerts, DashboardAlert } from '@/services/ai.service';

export default function AiDashboardAlerts() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getDashboardAlerts();
      setAlerts(response.alerts || []);
      setSummary(response.summary || '');
    } catch (err) {
      console.error('Error loading AI alerts:', err);
      setError('Không thể tải cảnh báo AI');
    } finally {
      setLoading(false);
    }
  };

  const getAlertStyles = (type: string) => {
    switch (type) {
      case 'CRITICAL':
        return {
          bg: 'bg-red-50 border-red-200',
          icon: 'bg-red-100 text-red-600',
          title: 'text-red-800',
          message: 'text-red-600',
          button: 'bg-red-100 hover:bg-red-200 text-red-700',
        };
      case 'WARNING':
        return {
          bg: 'bg-yellow-50 border-yellow-200',
          icon: 'bg-yellow-100 text-yellow-600',
          title: 'text-yellow-800',
          message: 'text-yellow-600',
          button: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700',
        };
      case 'SUCCESS':
        return {
          bg: 'bg-green-50 border-green-200',
          icon: 'bg-green-100 text-green-600',
          title: 'text-green-800',
          message: 'text-green-600',
          button: 'bg-green-100 hover:bg-green-200 text-green-700',
        };
      default: // INFO
        return {
          bg: 'bg-blue-50 border-blue-200',
          icon: 'bg-blue-100 text-blue-600',
          title: 'text-blue-800',
          message: 'text-blue-600',
          button: 'bg-blue-100 hover:bg-blue-200 text-blue-700',
        };
    }
  };

  const getDefaultIcon = (type: string) => {
    switch (type) {
      case 'CRITICAL': return '🔴';
      case 'WARNING': return '⚠️';
      case 'SUCCESS': return '✅';
      default: return 'ℹ️';
    }
  };

  const getIconEmoji = (iconName: string | undefined, type: string) => {
    if (!iconName) return getDefaultIcon(type);
    switch (iconName) {
      case 'alert-circle':
        return '🔴';
      case 'alert-triangle':
        return '⚠️';
      case 'package':
        return '📦';
      default:
        return getDefaultIcon(type);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">🤖</span>
            </div>
            <h3 className="text-lg font-bold text-gray-800">Trợ lý AI</h3>
          </div>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-gray-600">Đang phân tích dữ liệu...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">🤖</span>
            </div>
            <h3 className="text-lg font-bold text-gray-800">Trợ lý AI</h3>
          </div>
          <button
            onClick={loadAlerts}
            className="text-sm text-purple-600 hover:text-purple-800"
          >
            Thử lại
          </button>
        </div>
        <div className="text-center py-4 text-gray-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center animate-pulse">
            <span className="text-white text-lg">🤖</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">Trợ lý AI</h3>
            <p className="text-xs text-gray-500">Cảnh báo thông minh từ hệ thống</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadAlerts}
            className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title="Làm mới"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
          >
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className={`transform transition-transform ${expanded ? 'rotate-180' : ''}`}
            >
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-3 mb-4 border border-purple-100">
          <p className="text-sm text-purple-800">{summary}</p>
        </div>
      )}

      {/* Alerts */}
      {expanded && (
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <span className="text-3xl">✨</span>
              <p className="mt-2">Không có cảnh báo nào. Hệ thống hoạt động tốt!</p>
            </div>
          ) : (
            alerts.map((alert, index) => {
              const styles = getAlertStyles(alert.type);
              return (
                <div
                  key={index}
                  className={`${styles.bg} border rounded-lg p-4 transition-all hover:shadow-md`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`${styles.icon} w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xl`}>
                      {getIconEmoji(alert.icon, alert.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`${styles.title} font-semibold text-sm`}>{alert.title}</h4>
                      <p className={`${styles.message} text-sm mt-1`}>{alert.message}</p>
                      {alert.action && (
                        <button
                          onClick={() => router.push(alert.action!)}
                          className={`${styles.button} mt-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors`}
                        >
                          Xem chi tiết →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => router.push('/reports')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-medium transition-colors"
          >
            📊 Báo cáo AI
          </button>
          <button
            onClick={() => router.push('/reports/inventory-report')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-colors"
          >
            📦 Báo cáo tồn kho
          </button>
          <button
            onClick={() => router.push('/dashboard/products')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium transition-colors"
          >
            🛍️ Quản lý hàng hóa
          </button>
        </div>
      </div>
    </div>
  );
}

