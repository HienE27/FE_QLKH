'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import {
  ComboSuggestionResponse,
  ReportRequest,
  ReportResponse,
  SalesTrendResponse,
  getComboSuggestions,
  generateReport,
  getSalesTrend,
} from '@/services/ai.service';

const trendOptions: Array<'WEEKLY' | 'MONTHLY' | 'QUARTERLY'> = ['WEEKLY', 'MONTHLY', 'QUARTERLY'];
const reportTypes: ReportRequest['reportType'][] = ['INVENTORY', 'SALES', 'IMPORT_EXPORT', 'ALL'];
const reportPeriods: ReportRequest['period'][] = ['DAILY', 'WEEKLY', 'MONTHLY'];

function formatCurrency(value: number) {
  return value.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
}

const COLOR_FUNCTION_REGEX =
  /(background-)?color:\s*[^;]*(lab|lch|oklab|oklch)\([^)]+\)[^;]*;?/gi;
const RAW_COLOR_FUNCTION_REGEX = /(lab|lch|oklab|oklch)\([^)]+\)/gi;

function sanitizeHtmlContent(html: string) {
  return html
    .replace(COLOR_FUNCTION_REGEX, (_, prefix) => `${prefix ? `${prefix}` : ''}color:#1f2937;`)
    .replace(RAW_COLOR_FUNCTION_REGEX, '#1f2937');
}

export default function AiFeaturePanels() {
  const [trendPeriod, setTrendPeriod] = useState<'WEEKLY' | 'MONTHLY' | 'QUARTERLY'>('MONTHLY');
  const [trendData, setTrendData] = useState<SalesTrendResponse | null>(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState<string | null>(null);
  const [trendFetchedAt, setTrendFetchedAt] = useState<Date | null>(null);

  const [reportRequest, setReportRequest] = useState<ReportRequest>({
    reportType: 'ALL',
    period: 'WEEKLY',
    format: 'HTML',
  });
  const [reportData, setReportData] = useState<ReportResponse | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const reportPreviewRef = useRef<HTMLDivElement>(null);

  const [comboData, setComboData] = useState<ComboSuggestionResponse | null>(null);
  const [comboLoading, setComboLoading] = useState(false);

  const fetchTrend = async () => {
    setTrendLoading(true);
    setTrendError(null);
    try {
      const data = await getSalesTrend(trendPeriod);
      setTrendData(data);
      setTrendFetchedAt(new Date());
    } catch (error) {
      setTrendError(error instanceof Error ? error.message : 'Không thể tải dữ liệu xu hướng.');
    } finally {
      setTrendLoading(false);
    }
  };

  useEffect(() => {
    void fetchTrend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trendStats = useMemo(() => {
    if (!trendData) return { totalRevenue: 0, totalOrders: 0, maxGrowth: 0 };
    return trendData.trendData.reduce(
      (acc, item) => ({
        totalRevenue: acc.totalRevenue + item.revenue,
        totalOrders: acc.totalOrders + item.orders,
        maxGrowth: Math.max(acc.maxGrowth, item.growth),
      }),
      { totalRevenue: 0, totalOrders: 0, maxGrowth: 0 },
    );
  }, [trendData]);

  const handleReport = async () => {
    setReportLoading(true);
    try {
      const data = await generateReport(reportRequest);
      setReportData({
        ...data,
        htmlContent: sanitizeHtmlContent(data.htmlContent),
      });
    } catch (error) {
      console.error(error);
    } finally {
      setReportLoading(false);
    }
  };

  const downloadReport = async (format: 'HTML' | 'PDF' | 'EXCEL') => {
    if (!reportData) return;

    const title = reportData.title || 'bao-cao-ai';

    const sanitizedHtml = sanitizeHtmlContent(reportData.htmlContent);

    if (format === 'HTML') {
      const blob = new Blob([sanitizedHtml], { type: 'text/html;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${title}.html`;
      link.click();
      URL.revokeObjectURL(link.href);
    }

    if (format === 'PDF' && reportPreviewRef.current) {
      const doc = new jsPDF('p', 'pt', 'a4');
      await doc.html(reportPreviewRef.current, {
        html2canvas: {
          scale: 0.6,
          logging: false,
        },
        callback: () => {
          doc.save(`${title}.pdf`);
        },
        margin: [20, 20, 20, 20],
      });
    }

    if (format === 'EXCEL' && reportPreviewRef.current) {
      const table = reportPreviewRef.current.querySelector('table');
      if (table) {
        const workbook = XLSX.utils.table_to_book(table as HTMLTableElement, { sheet: 'Report' });
        XLSX.writeFile(workbook, `${title}.xlsx`);
      } else {
        const worksheet = XLSX.utils.aoa_to_sheet([
          ['Title', reportData.title],
          ['Summary', reportData.summary],
          ['Highlights', reportData.highlights],
        ]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
        XLSX.writeFile(workbook, `${title}.xlsx`);
      }
    }
  };

  const fetchCombos = async () => {
    setComboLoading(true);
    try {
      const data = await getComboSuggestions();
      setComboData(data);
    } finally {
      setComboLoading(false);
    }
  };

  return (
    <div className="space-y-8 mb-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase text-sky-500 font-semibold">Phân tích xu hướng</p>
              <h3 className="text-xl font-semibold text-gray-800">Bán hàng & tăng trưởng</h3>
            </div>
            <select
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              value={trendPeriod}
              onChange={(e) => setTrendPeriod(e.target.value as typeof trendPeriod)}
            >
              {trendOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === 'WEEKLY' ? 'Theo tuần' : opt === 'MONTHLY' ? 'Theo tháng' : 'Theo quý'}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {trendOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setTrendPeriod(option)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                  trendPeriod === option
                    ? 'bg-sky-500 text-white border-sky-500'
                    : 'border-gray-200 text-gray-600 hover:border-sky-200'
                }`}
              >
                {option === 'WEEKLY' ? 'Tuần' : option === 'MONTHLY' ? 'Tháng' : 'Quý'}
              </button>
            ))}
            <button
              type="button"
              onClick={() => void fetchTrend()}
              className="px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition ml-auto"
              disabled={trendLoading}
            >
              {trendLoading ? 'Đang phân tích...' : 'Làm mới'}
            </button>
          </div>
          {trendError && (
            <div className="mb-3 px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600">
              {trendError}
            </div>
          )}
          {trendData && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
                  <p className="text-xs uppercase text-gray-400">Tổng doanh thu</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {formatCurrency(trendStats.totalRevenue)}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
                  <p className="text-xs uppercase text-gray-400">Tổng đơn hàng</p>
                  <p className="text-lg font-semibold text-gray-800">{trendStats.totalOrders}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
                  <p className="text-xs uppercase text-gray-400">Tăng trưởng đỉnh</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {trendStats.maxGrowth.toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-xl bg-sky-50 border border-sky-100 flex-1">
                  <p className="text-xs uppercase text-sky-600">Xu hướng</p>
                  <p className="text-lg font-semibold text-gray-800">{trendData.trend}</p>
                  <p className="text-sm text-gray-500">
                    Tăng trưởng {trendData.growthRate?.toFixed(2)}%
                  </p>
                </div>
                <div className="flex-1 p-4 rounded-xl bg-indigo-50 border border-indigo-100">
                  <p className="text-xs uppercase text-indigo-600">Dự báo</p>
                  <p className="text-sm text-gray-700">{trendData.forecast}</p>
                </div>
              </div>
              <div className="space-y-2">
                {trendData.trendData.slice(0, 5).map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{item.label}</span>
                      <span>{formatCurrency(item.revenue)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden relative">
                      <span
                        className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 transition-all"
                        style={{ width: `${Math.min(Math.abs(item.growth), 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs uppercase text-gray-400 mb-1">Top sản phẩm</p>
                <div className="flex flex-wrap gap-2">
                  {trendData.topProducts.map((product) => (
                    <span
                      key={product}
                      className="px-3 py-1 text-xs bg-gray-100 rounded-full text-gray-700"
                    >
                      {product}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{trendData.analysis}</p>
              <ul className="list-disc pl-4 text-sm text-gray-600 space-y-1">
                {trendData.recommendations.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
              {trendFetchedAt && (
                <p className="text-xs text-gray-400">
                  Cập nhật lúc {trendFetchedAt.toLocaleTimeString('vi-VN')}
                </p>
              )}
            </div>
          )}
          {trendLoading && (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="h-16 bg-slate-100 rounded-xl" />
              ))}
            </div>
          )}
        </section>

        {/* Auto report */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase text-purple-500 font-semibold">Báo cáo tự động</p>
              <h3 className="text-xl font-semibold text-gray-800">Xuất báo cáo AI</h3>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              {reportTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setReportRequest((prev) => ({ ...prev, reportType: type }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                    reportRequest.reportType === type
                      ? 'bg-purple-500 text-white border-purple-500'
                      : 'border-gray-200 text-gray-600 hover:border-purple-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex gap-2 flex-wrap">
              {reportPeriods.map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setReportRequest((prev) => ({ ...prev, period }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                    reportRequest.period === period
                      ? 'bg-pink-500 text-white border-pink-500'
                      : 'border-gray-200 text-gray-600 hover:border-pink-200'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void handleReport()}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition"
              disabled={reportLoading}
            >
              {reportLoading ? 'Đang tạo...' : 'Tạo báo cáo'}
            </button>
            <select
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              value={reportRequest.format}
              onChange={(e) =>
                setReportRequest((prev) => ({ ...prev, format: e.target.value as ReportRequest['format'] }))
              }
            >
              {['HTML', 'PDF', 'EXCEL'].map((fmt) => (
                <option key={fmt} value={fmt}>
                  Định dạng ưu tiên: {fmt}
                </option>
              ))}
            </select>
            {reportData && (
              <div className="flex flex-wrap gap-2">
                {['HTML', 'PDF', 'EXCEL'].map((format) => (
                  <button
                    key={format}
                    type="button"
                    onClick={() => void downloadReport(format as 'HTML' | 'PDF' | 'EXCEL')}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Xuất {format}
                  </button>
                ))}
              </div>
            )}
          </div>
          {reportLoading && <div className="h-40 bg-slate-100 rounded-xl animate-pulse" />}
          {reportData && (
            <div className="border border-gray-100 rounded-xl p-4 max-h-80 overflow-auto">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{reportData.title}</p>
                  <p className="text-xs text-gray-500">{reportData.reportType}</p>
                </div>
                <span className="text-xs text-gray-400">
                  Định dạng ưu tiên: {reportRequest.format ?? 'HTML'}
                </span>
              </div>
              <p className="text-sm text-gray-600 my-3">{reportData.summary}</p>
              <div className="text-sm text-gray-600 mb-3">{reportData.highlights}</div>
              <div
                ref={reportPreviewRef}
                className="prose prose-sm max-w-none bg-gray-50 border border-gray-100 rounded-lg p-3"
                dangerouslySetInnerHTML={{ __html: sanitizeHtmlContent(reportData.htmlContent) }}
              />
              <p className="text-sm text-gray-600 mt-3">{reportData.recommendations}</p>
            </div>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase text-amber-500 font-semibold">Combo gợi ý</p>
              <h3 className="text-xl font-semibold text-gray-800">Tối ưu khuyến mãi</h3>
            </div>
            <button
              type="button"
              onClick={() => void fetchCombos()}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition"
              disabled={comboLoading}
            >
              {comboLoading ? 'Đang xử lý...' : 'Lấy gợi ý'}
            </button>
          </div>
          {comboData && (
            <div className="space-y-4 max-h-96 overflow-auto pr-2">
              {comboData.combos.map((combo) => (
                <div key={combo.name} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-semibold text-gray-800">{combo.name}</h4>
                    <span className="text-sm font-medium text-red-500">-{combo.discount}%</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{combo.reason}</p>
                  <ul className="text-sm text-gray-700 space-y-1 mb-2">
                    {combo.items.map((item) => (
                      <li key={item.code}>
                        {item.name} ×{item.quantity} - {formatCurrency(item.price)}
                      </li>
                    ))}
                  </ul>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{combo.targetCustomer}</span>
                    <span className="font-semibold text-gray-800">
                      {formatCurrency(combo.comboPrice)}{' '}
                      <span className="text-xs text-gray-400 line-through">
                        {formatCurrency(combo.originalPrice)}
                      </span>
                    </span>
                  </div>
                </div>
              ))}
              <p className="text-sm text-gray-600">{comboData.analysis}</p>
            </div>
          )}
        </section>

        {/* reserving space for future feature */}
      </div>
    </div>
  );
}

