'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
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
const reportTypeLabels: Record<ReportRequest['reportType'], string> = {
  INVENTORY: 'Tồn kho',
  SALES: 'Doanh số',
  IMPORT_EXPORT: 'Nhập/Xuất',
  ALL: 'Tổng hợp',
};
const reportPeriodLabels: Record<ReportRequest['period'], string> = {
  DAILY: 'Theo ngày',
  WEEKLY: 'Theo tuần',
  MONTHLY: 'Theo tháng',
};

function formatCurrency(value: number) {
  return value.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
}

const COLOR_FUNCTION_REGEX =
  /(background-)?(color|border-color|outline-color|fill|stroke):\s*[^;]*(lab|lch|oklab|oklch)\([^)]+\)[^;]*;?/gi;
const RAW_COLOR_FUNCTION_REGEX = /(lab|lch|oklab|oklch)\([^)]+\)/gi;
const COLOR_MIX_REGEX = /color-mix\(\s*in\s+(?:lab|lch|oklab|oklch)[^)]+\)/gi;
const STYLE_TAG_REGEX = /<style[\s\S]*?>[\s\S]*?<\/style>/gi;
const BASE_EXPORT_STYLE = `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600&display=swap');
    :root {
      font-family: 'Be Vietnam Pro', 'Segoe UI', Arial, sans-serif;
      color: #1f2937;
    }
    body { margin: 0; padding: 0; background: #ffffff; }
    h1, h2, h3, h4, h5 { color: #111827; margin-bottom: 8px; }
    p, span, li { color: #374151; line-height: 1.5; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin: 12px 0; }
    th, td { border: 1px solid #e5e7eb; padding: 6px; }
    th { background: #f3f4f6; font-weight: 600; }
    .report-wrapper { padding: 32px; max-width: 720px; margin: 0 auto; }
    .report-article { display: flex; flex-direction: column; gap: 16px; }
    .report-section { margin-top: 12px; }
    .report-header h1 { margin: 4px 0; font-size: 24px; }
    .report-meta { font-size: 13px; color: #6b7280; }
    .report-summary { padding: 12px 16px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; }
    ul { padding-left: 18px; }
    ul li { margin-bottom: 4px; }
    .chart-grid { display: flex; flex-direction: column; gap: 12px; margin-top: 12px; }
    .chart-item { display: flex; flex-direction: column; gap: 4px; }
    .chart-label { font-size: 13px; color: #111827; font-weight: 500; }
    .chart-bar { position: relative; width: 100%; height: 16px; background: #e5e7eb; border-radius: 8px; overflow: hidden; }
    .chart-bar-fill { position: absolute; inset: 0; background: linear-gradient(90deg, #38bdf8, #2563eb); }
    .chart-bar-value { font-size: 12px; color: #4b5563; margin-top: 2px; }
  </style>
`;

function sanitizeHtmlContent(html: string) {
  return html
    .replace(COLOR_FUNCTION_REGEX, (_, prefix = '', property = '') => `${prefix ?? ''}${property}:#1f2937;`)
    .replace(RAW_COLOR_FUNCTION_REGEX, '#1f2937')
    .replace(COLOR_MIX_REGEX, '#1f2937')
    .replace(STYLE_TAG_REGEX, '');
}

function enhanceTextCharts(html: string) {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return html;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const headings = Array.from(doc.querySelectorAll('h2, h3, h4')).filter((el) =>
      (el.textContent || '').toLowerCase().includes('text-based'),
    );

    headings.forEach((heading) => {
      const rows: Array<{ label: string; value: number }> = [];
      const removable: Element[] = [];
      let node = heading.nextElementSibling;

      while (node && !/^H[1-6]$/.test(node.tagName)) {
        const text = node.textContent?.trim();
        if (!text || text.length === 0) {
          removable.push(node);
          node = node.nextElementSibling;
          continue;
        }
        const match = text.match(/^([^:]+):.*?(\d+)\)?$/u);
        if (match) {
          rows.push({ label: match[1].trim(), value: Number(match[2]) });
          removable.push(node);
          node = node.nextElementSibling;
          continue;
        }
        // Stop when encountering paragraph/table that isn't part of the chart
        break;
      }

      if (!rows.length) return;
      removable.forEach((el) => el.remove());

      const maxValue = Math.max(...rows.map((row) => row.value), 1);
      const container = doc.createElement('div');
      container.className = 'chart-grid';

      rows.forEach((row) => {
        const item = doc.createElement('div');
        item.className = 'chart-item';

        const label = doc.createElement('div');
        label.className = 'chart-label';
        label.textContent = `${row.label} (${row.value})`;

        const bar = doc.createElement('div');
        bar.className = 'chart-bar';

        const fill = doc.createElement('span');
        fill.className = 'chart-bar-fill';
        fill.style.width = `${Math.max((row.value / maxValue) * 100, 8)}%`;

        bar.appendChild(fill);
        item.appendChild(label);
        item.appendChild(bar);
        container.appendChild(item);
      });

      heading.insertAdjacentElement('afterend', container);
    });

    return doc.body.innerHTML;
  } catch (error) {
    console.warn('enhanceTextCharts error', error);
    return html;
  }
}

function parseBulletList(content?: string) {
  if (!content) return [];
  return content
    .replace(/<\/?[^>]+>/g, '\n')
    .split(/\r?\n|•/u)
    .map((entry) => entry.replace(/^[\s•\-–]+/, '').trim())
    .filter(Boolean);
}

function buildReportHtmlDocument(bodyHtml: string) {
  return `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8" />${BASE_EXPORT_STYLE}</head><body><div class="report-wrapper">${bodyHtml}</div></body></html>`;
}

function buildReportBody({
  title,
  period,
  summary,
  generatedHtml,
  highlights,
  recommendations,
}: {
  title?: string;
  period?: ReportRequest['period'];
  summary?: string;
  generatedHtml?: string;
  highlights?: string;
  recommendations?: string;
}) {
  const highlightSection = buildBulletSection('Điểm nổi bật', highlights);
  const recommendationSection = buildBulletSection('Khuyến nghị', recommendations);

  return `
    <article class="report-article">
      <header class="report-header">
        <p class="report-meta">BÁO CÁO AI • ${translatePeriod(period)}</p>
        <h1>${title ?? 'Báo cáo AI'}</h1>
        <p class="report-meta">Ngày tạo: ${new Date().toLocaleDateString('vi-VN')}</p>
      </header>
      ${summary ? `<section class="report-section report-summary"><p>${summary}</p></section>` : ''}
      <section class="report-section">${generatedHtml ?? ''}</section>
      ${highlightSection}
      ${recommendationSection}
    </article>
  `;
}

function buildBulletSection(label: string, content?: string) {
  const items = parseBulletList(content);
  if (!items.length) return '';
  return `
    <section class="report-section">
      <h3>${label}</h3>
      <ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>
    </section>
  `;
}

function translatePeriod(period?: ReportRequest['period']) {
  switch (period) {
    case 'DAILY':
      return 'Theo ngày';
    case 'WEEKLY':
      return 'Theo tuần';
    case 'MONTHLY':
      return 'Theo tháng';
    default:
      return 'Chu kỳ linh hoạt';
  }
}

function buildExcelWorkbook(report: ReportResponse, period?: ReportRequest['period']) {
  const workbook = XLSX.utils.book_new();
  const summaryRows: Array<Array<string>> = [
    ['Tiêu đề', report.title ?? 'Báo cáo AI'],
    ['Chu kỳ', translatePeriod(period)],
    ['Ngày tạo', new Date().toLocaleDateString('vi-VN')],
  ];
  if (report.summary) {
    summaryRows.push(['Tóm tắt', report.summary]);
  }

  const highlights = parseBulletList(report.highlights);
  if (highlights.length) {
    summaryRows.push(['Điểm nổi bật', '']);
    highlights.forEach((item, idx) => summaryRows.push([`- ${idx + 1}`, item]));
  }

  const recommendations = parseBulletList(report.recommendations);
  if (recommendations.length) {
    summaryRows.push(['Khuyến nghị', '']);
    recommendations.forEach((item, idx) => summaryRows.push([`- ${idx + 1}`, item]));
  }

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Tong hop');

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${report.htmlContent}</div>`, 'text/html');
    const tables = doc.querySelectorAll('table');
    tables.forEach((table, idx) => {
      const aoa = Array.from(table.rows).map((row) =>
        Array.from(row.cells).map((cell) => cell.textContent?.trim() ?? ''),
      );
      if (aoa.length) {
        const sheet = XLSX.utils.aoa_to_sheet(aoa);
        XLSX.utils.book_append_sheet(workbook, sheet, `Bang ${idx + 1}`);
      }
    });
  } catch (error) {
    console.warn('buildExcelWorkbook error', error);
  }

  return workbook;
}

async function createIsolatedExportNode(html: string) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '0';
  iframe.style.width = '794px';
  iframe.style.height = '1123px';
  iframe.style.background = '#fff';
  document.body.appendChild(iframe);

  const ready = new Promise<void>((resolve, reject) => {
    iframe.onload = () => resolve();
    iframe.onerror = () => reject(new Error('Không load được iframe export'));
  });

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    throw new Error('Không thể tạo iframe cho export');
  }

  doc.open();
  doc.write(buildReportHtmlDocument(html));
  doc.close();

  await ready;
  return iframe;
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
      const normalizedContent = enhanceTextCharts(sanitizeHtmlContent(data.htmlContent));
      setReportData({
        ...data,
        htmlContent: normalizedContent,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setReportLoading(false);
    }
  };

  const exportBody = useMemo(() => {
    if (!reportData) return '';
    return buildReportBody({
      title: reportData.title,
      period: reportRequest.period,
      summary: reportData.summary,
      generatedHtml: reportData.htmlContent,
      highlights: reportData.highlights,
      recommendations: reportData.recommendations,
    });
  }, [reportData, reportRequest.period]);

  const downloadReport = async (format: 'HTML' | 'PDF' | 'EXCEL') => {
    if (!reportData) return;

    const title = reportData.title || 'bao-cao-ai';

    if (format === 'HTML' && exportBody) {
      const htmlDocument = buildReportHtmlDocument(exportBody);
      const blob = new Blob([htmlDocument], { type: 'text/html;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${title}.html`;
      link.click();
      URL.revokeObjectURL(link.href);
    }

    if (format === 'PDF' && exportBody) {
      const doc = new jsPDF('p', 'pt', 'a4');
      const iframe = await createIsolatedExportNode(exportBody);
      try {
        const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!frameDoc) throw new Error('Không render được iframe export');
        const content = frameDoc.querySelector('.report-wrapper') as HTMLElement;
        if (!content) throw new Error('Không tìm thấy nội dung báo cáo');

        const canvas = await html2canvas(content, {
          scale: 2,
          logging: false,
          backgroundColor: '#ffffff',
          useCORS: true,
          scrollX: 0,
          scrollY: 0,
        });

        const imgData = canvas.toDataURL('image/png');
        const pdfWidth = doc.internal.pageSize.getWidth();
        const pdfHeight = doc.internal.pageSize.getHeight();
        const imgProps = {
          width: canvas.width,
          height: canvas.height,
        };
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        let heightLeft = imgHeight;
        let position = 0;

        doc.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          doc.addPage();
          doc.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
          heightLeft -= pdfHeight;
        }

        doc.save(`${title}.pdf`);
      } finally {
        document.body.removeChild(iframe);
      }
    }

    if (format === 'EXCEL') {
      const workbook = buildExcelWorkbook(reportData, reportRequest.period);
      XLSX.writeFile(workbook, `${title}.xlsx`);
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
                  {reportTypeLabels[type]}
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
                  {reportPeriodLabels[period]}
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
            <button
              type="button"
              onClick={() => void handleReport()}
              className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition disabled:opacity-60"
              disabled={reportLoading || !reportData}
            >
              Làm mới dữ liệu
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
                dangerouslySetInnerHTML={{ __html: reportData.htmlContent }}
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

