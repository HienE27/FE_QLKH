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
  try {
    // BE exposes /api/ai/dashboard-alerts in AiAdvancedController
    const response = await apiFetch<ApiResponse<DashboardAlertsResponse>>('/api/ai/dashboard-alerts');
  return response.data;
  } catch (err) {
    // Nếu BE chưa có endpoint /api/ai-alerts hoặc trả 404 thì trả về rỗng để tránh crash UI
    const message = err instanceof Error ? err.message : '';
    if (message.includes('404')) {
      return { alerts: [], summary: '' };
    }
    throw err;
  }
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

// ======================== 8. RECEIPT OCR (PHIẾU NHẬP/XUẤT) ========================
export interface ReceiptOCRRequest {
  imageUrl?: string;
  imageBase64?: string;
  receiptType: 'IMPORT' | 'EXPORT';
}

export interface ExtractedProduct {
  name: string;
  code?: string | null;
  quantity: number;
  unitPrice: number;
  discount?: number | null;
  totalPrice: number;
  unit?: string | null;
  warehouse?: string | null; // Tên kho hàng (ví dụ: "Kho 1 (KH001)")
  suggestedProductId?: number | null;
  matchScore?: number | null;
}

export interface ReceiptOCRResponse {
  receiptType: 'IMPORT' | 'EXPORT';
  supplierName?: string | null;
  customerName?: string | null;
  supplierPhone?: string | null;
  customerPhone?: string | null;
  supplierAddress?: string | null;
  customerAddress?: string | null;
  receiptCode?: string | null;
  receiptDate?: string | null;
  note?: string | null;
  products: ExtractedProduct[];
  totalAmount?: number | null;
  rawText?: string | null;
  confidence?: number | null;
}

export async function ocrReceipt(request: ReceiptOCRRequest): Promise<ReceiptOCRResponse> {
  const response = await apiFetch<ApiResponse<ReceiptOCRResponse>>('/api/ai/receipt-ocr', {
    method: 'POST',
    body: JSON.stringify(request),
  });
  return response.data;
}

// ======================== SMART INVENTORY ALERT ========================
export interface InventoryAlert {
  type: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'SLOW_SELLING' | 'FAST_SELLING';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  productId: number;
  productCode: string;
  productName: string;
  currentStock: number;
  predictedDaysRemaining?: number | null;
  avgDailySales?: number | null;
  message: string;
  recommendation: string;
}

export interface SmartInventoryAlertResponse {
  alerts: InventoryAlert[];
  summary: string;
}

export async function getSmartInventoryAlerts(): Promise<SmartInventoryAlertResponse> {
  const response = await apiFetch<ApiResponse<SmartInventoryAlertResponse>>('/api/ai/reports/inventory-alerts');
  return response.data;
}

// ======================== DEMAND FORECASTING ========================
export interface ForecastItem {
  productId: number;
  productCode: string;
  productName: string;
  currentStock: number;
  predictedDaysUntilReorder: number;
  recommendedQuantity: number;
  optimalStockLevel: number;
  confidence: number;
  reasoning: string;
}

export interface DemandForecastResponse {
  forecasts: ForecastItem[];
  summary: string;
  analysis: string;
}

export async function getDemandForecast(): Promise<DemandForecastResponse> {
  const response = await apiFetch<ApiResponse<DemandForecastResponse>>('/api/ai/reports/demand-forecast');
  return response.data;
}

// ======================== 2.1. PRODUCT DEMAND FORECAST ========================
export interface DailyForecast {
  day: number;
  predictedStock: number;
  predictedSales: number;
  date: string;
}

export interface ProductDemandForecastResponse {
  productId: number;
  productCode: string;
  productName: string;
  currentStock: number;
  avgDailySales: number;
  predictedDaysUntilStockOut: number | null;
  recommendedReorderQuantity: number | null;
  optimalStockLevel: number | null;
  confidence: number;
  detailedAnalysis: string;
  recommendations: string;
  dailyForecasts: DailyForecast[];
}

export async function getProductDemandForecast(
  productId: number,
  days: number = 30
): Promise<ProductDemandForecastResponse> {
  const response = await apiFetch<ApiResponse<ProductDemandForecastResponse>>(
    `/api/ai/reports/demand-forecast/product/${productId}?days=${days}`
  );
  return response.data;
}

// ======================== SALES INSIGHTS ========================
export interface RevenueAnalysis {
  trend: 'INCREASING' | 'DECREASING' | 'STABLE';
  growthRate: number;
  reason: string;
  currentRevenue: number;
  previousRevenue: number;
}

export interface TopProduct {
  productId: number;
  productCode: string;
  productName: string;
  revenue: number;
  quantitySold: number;
  rank: number;
}

export interface DecliningProduct {
  productId: number;
  productCode: string;
  productName: string;
  revenueDecline: number;
  reason: string;
}

export interface HourSales {
  hour: number;
  revenue: number;
  orderCount: number;
}

export interface BestSellingHours {
  hourlyData: HourSales[];
  peakHours: string;
}

export interface SeasonalProduct {
  productId: number;
  productCode: string;
  productName: string;
  season: 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER' | 'ALL_YEAR';
  seasonalMultiplier: number;
}

export interface SalesInsightResponse {
  revenueAnalysis: RevenueAnalysis;
  topProducts: TopProduct[];
  decliningProducts: DecliningProduct[];
  bestSellingHours: BestSellingHours;
  seasonalProducts: SeasonalProduct[];
  overallAnalysis: string;
}

export async function getSalesInsights(days: number = 30): Promise<SalesInsightResponse> {
  const response = await apiFetch<ApiResponse<SalesInsightResponse>>(`/api/ai/reports/sales-insights?days=${days}`);
  return response.data;
}

// ======================== INVENTORY TURNOVER ========================
export interface ProductTurnover {
  productId: number;
  productCode: string;
  productName: string;
  turnoverRate: number;
  daysInStock: number;
  efficiency: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface DeadStock {
  productId: number;
  productCode: string;
  productName: string;
  quantity: number;
  daysSinceLastSale: number;
  totalValue: number;
  recommendation: string;
}

export interface OverstockedItem {
  productId: number;
  productCode: string;
  productName: string;
  currentStock: number;
  optimalStock: number;
  excessQuantity: number;
  recommendation: string;
}

export interface InventoryTurnoverResponse {
  overallTurnoverRate: number;
  productTurnovers: ProductTurnover[];
  deadStocks: DeadStock[];
  overstockedItems: OverstockedItem[];
  analysis: string;
  recommendations: string[];
}

export async function getInventoryTurnover(periodDays: number = 90): Promise<InventoryTurnoverResponse> {
  const response = await apiFetch<ApiResponse<InventoryTurnoverResponse>>(`/api/ai/reports/inventory-turnover?periodDays=${periodDays}`);
  return response.data;
}

// ======================== STOCK OPTIMIZATION ========================
export interface ProductOptimization {
  productId: number;
  productCode: string;
  productName: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  optimalReorderQuantity: number;
  reasoning: string;
}

export interface WarehouseRecommendation {
  productId: number;
  productCode: string;
  productName: string;
  recommendedStoreId: number;
  recommendedStoreName: string;
  reasoning: string;
}

export interface CategoryOptimization {
  categoryName: string;
  recommendations: string[];
  analysis: string;
}

export interface StockOptimizationResponse {
  optimizations: ProductOptimization[];
  warehouseRecommendations: WarehouseRecommendation[];
  categoryOptimizations: CategoryOptimization[];
  summary: string;
}

export async function getStockOptimization(): Promise<StockOptimizationResponse> {
  const response = await apiFetch<ApiResponse<StockOptimizationResponse>>('/api/ai/reports/stock-optimization');
  return response.data;
}

