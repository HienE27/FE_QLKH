import { apiFetch } from '@/lib/api-client';

interface ApiResponse<T> {
  success: boolean;
  message: string | null;
  data: T;
}

// ======================== CHAT ========================
export async function aiChat(message: string) {
  const response = await apiFetch<ApiResponse<{ message: string }>>('/api/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
  return response.data;
}

// ======================== PRODUCT DESCRIPTION ========================
export async function aiProductDescription(name: string) {
  const response = await apiFetch<ApiResponse<{
    shortDescription: string;
    seoDescription: string;
    longDescription: string;
    attributes: string[];
  }>>('/api/ai/product-description', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  return response.data;
}

// ======================== INVENTORY FORECAST ========================
export async function aiInventoryForecast(items: Array<{ code: string; name: string; quantity: number; avgDailySales?: number }>) {
  const response = await apiFetch<ApiResponse<{ recommendation: string }>>('/api/ai/inventory-forecast', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
  return response.data;
}

// ======================== 1. DASHBOARD ALERTS ========================
export interface DashboardAlert {
  type: 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS';
  title: string;
  message: string;
  action?: string;
  icon?: string;
}

export interface DashboardAlertsResponse {
  alerts: DashboardAlert[];
  summary: string;
}

export async function getDashboardAlerts(): Promise<DashboardAlertsResponse> {
  const response = await apiFetch<ApiResponse<DashboardAlertsResponse>>('/api/ai/dashboard-alerts');
  return response.data;
}

// ======================== 2. ABC ANALYSIS ========================
export interface ABCProduct {
  code: string;
  name: string;
  revenue: number;
  percentage: number;
  quantity: number;
}

export interface ABCAnalysisResponse {
  categoryA: ABCProduct[];
  categoryB: ABCProduct[];
  categoryC: ABCProduct[];
  analysis: string;
  recommendations: string;
}

export async function getABCAnalysis(): Promise<ABCAnalysisResponse> {
  const response = await apiFetch<ApiResponse<ABCAnalysisResponse>>('/api/ai/abc-analysis');
  return response.data;
}

// ======================== 3. PRICE SUGGESTION ========================
export interface PriceSuggestionRequest {
  productCode: string;
  productName: string;
  currentPrice: number;
  costPrice?: number;
  currentStock?: number;
  avgDailySales?: number;
  daysInStock?: number;
}

export interface PriceSuggestionResponse {
  suggestedPrice: number;
  minPrice: number;
  maxPrice: number;
  strategy: 'DISCOUNT' | 'MAINTAIN' | 'INCREASE';
  reasoning: string;
  expectedProfit: number;
  promotionSuggestion: string;
}

export async function getPriceSuggestion(request: PriceSuggestionRequest): Promise<PriceSuggestionResponse> {
  const response = await apiFetch<ApiResponse<PriceSuggestionResponse>>('/api/ai/price-suggestion', {
    method: 'POST',
    body: JSON.stringify(request),
  });
  return response.data;
}

// ======================== 4. SALES TREND ========================
export interface TrendData {
  label: string;
  revenue: number;
  orders: number;
  growth: number;
}

export interface SalesTrendResponse {
  period: string;
  trendData: TrendData[];
  trend: 'INCREASING' | 'DECREASING' | 'STABLE';
  growthRate: number;
  analysis: string;
  forecast: string;
  topProducts: string[];
  recommendations: string[];
}

export async function getSalesTrend(period: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' = 'WEEKLY'): Promise<SalesTrendResponse> {
  const response = await apiFetch<ApiResponse<SalesTrendResponse>>(`/api/ai/sales-trend?period=${period}`);
  return response.data;
}

// ======================== 5. AUTO REPORT ========================
export interface ReportRequest {
  reportType: 'INVENTORY' | 'SALES' | 'IMPORT_EXPORT' | 'ALL';
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  startDate?: string;
  endDate?: string;
  format?: 'PDF' | 'EXCEL' | 'HTML';
}

export interface ReportResponse {
  reportType: string;
  title: string;
  summary: string;
  htmlContent: string;
  highlights: string;
  recommendations: string;
}

export async function generateReport(request: ReportRequest): Promise<ReportResponse> {
  const response = await apiFetch<ApiResponse<ReportResponse>>('/api/ai/generate-report', {
    method: 'POST',
    body: JSON.stringify(request),
  });
  return response.data;
}

// ======================== 6. COMBO SUGGESTION ========================
export interface ComboItem {
  code: string;
  name: string;
  price: number;
  quantity: number;
}

export interface ComboSuggestion {
  name: string;
  items: ComboItem[];
  originalPrice: number;
  comboPrice: number;
  discount: number;
  reason: string;
  targetCustomer: string;
}

export interface ComboSuggestionResponse {
  combos: ComboSuggestion[];
  analysis: string;
}

export async function getComboSuggestions(): Promise<ComboSuggestionResponse> {
  const response = await apiFetch<ApiResponse<ComboSuggestionResponse>>('/api/ai/combo-suggestions');
  return response.data;
}

// ======================== 7. IMAGE OCR ========================
export interface ImageOCRRequest {
  imageBase64?: string;
  imageUrl?: string;
  documentType: 'INVOICE' | 'RECEIPT' | 'PRODUCT_LIST';
}

export interface ExtractedItem {
  name: string;
  code?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unit?: string;
}

export interface ImageOCRResponse {
  documentType: string;
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  items: ExtractedItem[];
  totalAmount: number;
  rawText: string;
  confidence: number;
}

export async function ocrInvoice(request: ImageOCRRequest): Promise<ImageOCRResponse> {
  const response = await apiFetch<ApiResponse<ImageOCRResponse>>('/api/ai/ocr-invoice', {
    method: 'POST',
    body: JSON.stringify(request),
  });
  return response.data;
}

