import { getToken } from '@/lib/auth';
import { API_BASE } from '@/config/api';

export type ExportStatus =
    | "PENDING"
    | "IMPORTED"
    | "EXPORTED"
    | "CANCELLED"
    | "APPROVED"
    | "REJECTED"
    | "RETURNED";

export interface SupplierExportDetail {
    id?: number;
    exportDetailId?: number;
    importDetailsId?: number;   // ⭐ THÊM: ID lô nhập
    productId: number;
    productCode?: string | null;
    productName?: string | null;
    unit?: string | null;
    unitName?: string | null;
    storeId?: number | null;   // ⭐ Kho xuất cho item này
    storeName?: string | null;  // ⭐ Tên kho
    storeCode?: string | null;  // ⭐ Mã kho
    quantity: number;
    unitPrice: number;
    discountPercent?: number;   // ⭐ THÊM: Phần trăm chiết khấu
}

export interface SupplierExport {
    id: number;
    code: string;
    storeId: number;
    supplierId: number;
    supplierCode?: string | null;
    supplierPhone?: string | null;
    supplierAddress?: string | null;
    customerId?: number | null;
    customerName?: string | null;
    customerPhone?: string | null;
    customerAddress?: string | null;
    status: ExportStatus;
    exportsDate: string;
    note?: string | null;
    description?: string | null;
    totalValue: number;
    supplierName?: string | null;
    attachmentImages?: string[];
    items?: SupplierExportDetail[];
    // Audit (optional)
    createdBy?: string | null;
    createdByName?: string | null;
    createdAt?: string | null;
    createdDate?: string | null;
    approvedBy?: string | null;
    approvedByName?: string | null;
    approvedAt?: string | null;
    rejectedBy?: string | null;
    rejectedByName?: string | null;
    rejectedAt?: string | null;
    exportedBy?: string | null;
    exportedByName?: string | null;
    exportedAt?: string | null;
}

type ApiResponse<T> = {
    data: T;
    message?: string;
    success?: boolean;
};

export interface PageResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
}

/* ============================================================
   GỘP TẤT CẢ PHIẾU NHẬP (NCC, NỘI BỘ, NVBH)
============================================================ */
export async function getAllImports(params?: {
    status?: ExportStatus | "ALL";
    code?: string;
    from?: string;
    to?: string;
}): Promise<SupplierImport[]> {
    const qs = new URLSearchParams();

    if (params?.status && params.status !== "ALL") {
        qs.set("status", params.status);
    }
    if (params?.code) qs.set("code", params.code);
    if (params?.from) qs.set("from", params.from);
    if (params?.to) qs.set("to", params.to);

    const url =
        qs.toString() === ""
            ? `${API_BASE}/api/imports`
            : `${API_BASE}/api/imports?${qs.toString()}`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        throw new Error("Không lấy được danh sách phiếu nhập");
    }

    const json: ApiResponse<SupplierImport[]> = await res.json();
    return json.data;
}

export async function searchImportsPaged(params?: {
    status?: ExportStatus | "ALL";
    code?: string;
    from?: string;
    to?: string;
    sortField?: "date" | "value";
    sortDir?: "asc" | "desc";
    page?: number;
    size?: number;
}): Promise<PageResponse<SupplierImport>> {
    const qs = new URLSearchParams();

    if (params?.status && params.status !== "ALL") {
        qs.set("status", params.status);
    }
    if (params?.code) qs.set("code", params.code);
    if (params?.from) qs.set("from", params.from);
    if (params?.to) qs.set("to", params.to);
    if (params?.sortField) qs.set("sortField", params.sortField);
    if (params?.sortDir) qs.set("sortDir", params.sortDir);
    if (typeof params?.page === "number") qs.set("page", String(params.page));
    if (typeof params?.size === "number") qs.set("size", String(params.size));

    const url =
        qs.toString() === ""
            ? `${API_BASE}/api/imports/search`
            : `${API_BASE}/api/imports/search?${qs.toString()}`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        throw new Error("Không lấy được danh sách phiếu nhập (phân trang)");
    }

    const json: ApiResponse<PageResponse<SupplierImport>> = await res.json();
    return json.data;
}

/* ============================================================
   GỘP TẤT CẢ PHIẾU XUẤT (NCC, NỘI BỘ, NVBH)
============================================================ */
export async function getAllExports(params?: {
    status?: ExportStatus | "ALL";
    code?: string;
    from?: string;
    to?: string;
}): Promise<SupplierExport[]> {
    const qs = new URLSearchParams();

    if (params?.status && params.status !== "ALL") {
        qs.set("status", params.status);
    }
    if (params?.code) qs.set("code", params.code);
    if (params?.from) qs.set("from", params.from);
    if (params?.to) qs.set("to", params.to);

    const url =
        qs.toString() === ""
            ? `${API_BASE}/api/exports`
            : `${API_BASE}/api/exports?${qs.toString()}`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        throw new Error("Không lấy được danh sách phiếu xuất");
    }

    const json: ApiResponse<SupplierExport[]> = await res.json();
    return json.data;
}

export async function searchExportsPaged(params?: {
    status?: ExportStatus | "ALL";
    code?: string;
    from?: string;
    to?: string;
    sortField?: "date" | "value";
    sortDir?: "asc" | "desc";
    page?: number;
    size?: number;
}): Promise<PageResponse<SupplierExport>> {
    const qs = new URLSearchParams();

    if (params?.status && params.status !== "ALL") {
        qs.set("status", params.status);
    }
    if (params?.code) qs.set("code", params.code);
    if (params?.from) qs.set("from", params.from);
    if (params?.to) qs.set("to", params.to);
    if (typeof params?.page === "number") qs.set("page", String(params.page));
    if (typeof params?.size === "number") qs.set("size", String(params.size));

    const url =
        qs.toString() === ""
            ? `${API_BASE}/api/exports/search`
            : `${API_BASE}/api/exports/search?${qs.toString()}`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        throw new Error("Không lấy được danh sách phiếu xuất (phân trang)");
    }

    const json: ApiResponse<PageResponse<SupplierExport>> = await res.json();
    return json.data;
}

/* ============================================================
   TẠO PHIẾU NHẬP GỘP (tự động xác định loại)
============================================================ */
export interface UnifiedImportDetailRequest {
    productId: number;
    storeId?: number; // Kho nhập cho dòng này (nếu không có thì dùng kho mặc định từ header)
    quantity: number;
    unitPrice: number;
    discountPercent?: number;
}

export interface UnifiedImportCreateRequest {
    code?: string;
    storeId: number;           // Kho nhập mặc định (bắt buộc)
    supplierId: number;        // Nhà cung cấp (bắt buộc)
    orderId?: number;          // ID đơn hàng (nếu nhập theo đơn)
    note?: string;
    description?: string;
    attachmentImages?: string[];
    items: UnifiedImportDetailRequest[];
}

export async function createImport(
    payload: UnifiedImportCreateRequest,
): Promise<SupplierImport> {
    const url = `${API_BASE}/api/imports`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        let msg = "Không tạo được phiếu nhập";
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json: ApiResponse<SupplierImport> = await res.json();
    return json.data;
}

/* ============================================================
   TẠO PHIẾU XUẤT GỘP (tự động xác định loại)
============================================================ */
export interface UnifiedExportDetailRequest {
    productId: number;
    storeId?: number; // Kho xuất cho dòng này (nếu không có thì dùng kho mặc định từ header)
    quantity: number;
    unitPrice: number;
    discountPercent?: number;
    importDetailsId?: number;
}

export interface UnifiedExportCreateRequest {
    code?: string;
    storeId: number;           // Kho xuất mặc định (bắt buộc)
    customerId?: number;       // ID khách hàng (bắt buộc nếu có)
    customerName: string;      // Tên khách hàng (bắt buộc)
    customerPhone?: string;    // SĐT khách hàng
    customerAddress?: string;  // Địa chỉ khách hàng
    orderId?: number;          // ID đơn hàng (nếu xuất theo đơn)
    note?: string;
    description?: string;
    attachmentImages?: string[];
    items: UnifiedExportDetailRequest[];
}

export async function createExport(
    payload: UnifiedExportCreateRequest,
): Promise<SupplierExport> {
    const url = `${API_BASE}/api/exports`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        let msg = "Không tạo được phiếu xuất";
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json: ApiResponse<SupplierExport> = await res.json();
    return json.data;
}

/* Lấy chi tiết phiếu nhập gộp */
export async function getImportById(id: number): Promise<SupplierImport> {
    const url = `${API_BASE}/api/imports/${id}`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        let errorMessage = "Không lấy được chi tiết phiếu nhập";
        try {
            const errorData = await res.json();
            if (errorData?.message) {
                errorMessage = errorData.message;
            } else if (typeof errorData === 'string') {
                errorMessage = errorData;
            }
        } catch {
            // Ignore JSON parse error
        }
        throw new Error(`${errorMessage} (HTTP ${res.status})`);
    }

    const json: ApiResponse<SupplierImport> = await res.json();
    return json.data;
}

/* Lấy chi tiết phiếu xuất gộp */
export async function getExportById(id: number): Promise<SupplierExport> {
    const url = `${API_BASE}/api/exports/${id}`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        throw new Error("Không lấy được chi tiết phiếu xuất");
    }

    const json: ApiResponse<SupplierExport> = await res.json();
    return json.data;
}

/* Cập nhật phiếu nhập gộp */
export async function updateImport(
    id: number,
    payload: UnifiedImportCreateRequest,
): Promise<SupplierImport> {
    const url = `${API_BASE}/api/imports/${id}`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "PUT",
        credentials: "include",
        headers,
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        let msg = "Không cập nhật được phiếu nhập";
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json: ApiResponse<SupplierImport> = await res.json();
    return json.data;
}

/* Cập nhật phiếu xuất gộp */
export async function updateExport(
    id: number,
    payload: UnifiedExportCreateRequest,
): Promise<SupplierExport> {
    const url = `${API_BASE}/api/exports/${id}`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "PUT",
        credentials: "include",
        headers,
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        let msg = "Không cập nhật được phiếu xuất";
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json: ApiResponse<SupplierExport> = await res.json();
    return json.data;
}

/* Xác nhận phiếu nhập gộp */
export async function confirmImport(id: number): Promise<SupplierImport> {
    const url = `${API_BASE}/api/imports/${id}/confirm`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        let msg = "Không xác nhận được phiếu nhập";
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json: ApiResponse<SupplierImport> = await res.json();
    return json.data;
}

/* Duyệt phiếu nhập (PENDING -> APPROVED) */
export async function approveImport(id: number): Promise<SupplierImport> {
    const url = `${API_BASE}/api/imports/${id}/approve`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        let msg = "Không duyệt được phiếu nhập";
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json: ApiResponse<SupplierImport> = await res.json();
    return json.data;
}

/* Xác nhận phiếu xuất gộp */
export async function confirmExport(id: number): Promise<SupplierExport> {
    const url = `${API_BASE}/api/exports/${id}/confirm`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        let msg = "Không xác nhận được phiếu xuất";
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json: ApiResponse<SupplierExport> = await res.json();
    return json.data;
}

/* Duyệt phiếu xuất (PENDING -> APPROVED) */
export async function approveExport(id: number): Promise<SupplierExport> {
    const url = `${API_BASE}/api/exports/${id}/approve`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        let msg = "Không duyệt được phiếu xuất";
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json: ApiResponse<SupplierExport> = await res.json();
    return json.data;
}

/* Hủy phiếu nhập gộp */
export async function cancelImport(id: number): Promise<SupplierImport> {
    const url = `${API_BASE}/api/imports/${id}/cancel`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        let msg = "Không hủy được phiếu nhập";
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json: ApiResponse<SupplierImport> = await res.json();
    return json.data;
}

/* Từ chối phiếu nhập */
export async function rejectImport(id: number): Promise<SupplierImport> {
    const url = `${API_BASE}/api/imports/${id}/reject`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        let msg = "Không từ chối được phiếu nhập";
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json: ApiResponse<SupplierImport> = await res.json();
    return json.data;
}

/* Hủy phiếu xuất gộp */
export async function cancelExport(id: number): Promise<SupplierExport> {
    const url = `${API_BASE}/api/exports/${id}/cancel`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        let msg = "Không hủy được phiếu xuất";
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json: ApiResponse<SupplierExport> = await res.json();
    return json.data;
}

/* Từ chối phiếu xuất */
export async function rejectExport(id: number): Promise<SupplierExport> {
    const url = `${API_BASE}/api/exports/${id}/reject`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        let msg = "Không từ chối được phiếu xuất";
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json: ApiResponse<SupplierExport> = await res.json();
    return json.data;
}

/* ============================================================
   LẤY DANH SÁCH PHIẾU XUẤT NCC (giữ lại để tương thích ngược)
============================================================ */
export async function getSupplierExports(params?: {
    status?: ExportStatus | "ALL";
    code?: string;
    fromDate?: string;
    toDate?: string;
}): Promise<SupplierExport[]> {
    const qs = new URLSearchParams();

    if (params?.status && params.status !== "ALL") {
        qs.set("status", params.status);
    }
    if (params?.code) qs.set("code", params.code);
    if (params?.fromDate) qs.set("fromDate", params.fromDate);
    if (params?.toDate) qs.set("toDate", params.toDate);

    const url =
        qs.toString() === ""
            ? `${API_BASE}/api/exports/suppliers`
            : `${API_BASE}/api/exports/suppliers?${qs.toString()}`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        throw new Error("Không lấy được danh sách phiếu xuất NCC");
    }

    const json: ApiResponse<SupplierExport[]> = await res.json();
    return json.data;
}

/* ============================================================
   TẠO PHIẾU XUẤT NCC
============================================================ */
export interface ExportDetailItemRequest {
    importDetailsId?: number;   // ⭐ Tùy chọn: ID lô nhập (không bắt buộc cho phiếu xuất NCC)
    productId: number;
    quantity: number;
    unitPrice: number;
    discountPercent?: number;   // ⭐ THÊM: Phần trăm chiết khấu
}

export interface SupplierExportCreateRequest {
    code?: string | null;
    storeId: number;
    supplierId: number;
    note?: string | null;
    description?: string | null;
    attachmentImages?: string[];
    items: ExportDetailItemRequest[];
}

export async function createSupplierExport(
    payload: SupplierExportCreateRequest,
): Promise<SupplierExport> {
    const url = `${API_BASE}/api/exports/suppliers`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        let msg = "Không tạo được phiếu xuất kho";
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json: ApiResponse<SupplierExport> = await res.json();
    return json.data;
}

/* Lấy chi tiết phiếu xuất NCC */
export async function getSupplierExportById(
    id: number,
): Promise<SupplierExport> {
    const url = `${API_BASE}/api/exports/suppliers/${id}`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        throw new Error("Không lấy được chi tiết phiếu xuất NCC");
    }

    const json: ApiResponse<SupplierExport> = await res.json();
    return json.data;
}

/* Cập nhật phiếu xuất NCC */
export async function updateSupplierExport(
    id: number,
    payload: SupplierExportCreateRequest,
): Promise<SupplierExport> {
    const url = `${API_BASE}/api/exports/suppliers/${id}`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "PUT",
        credentials: "include",
        headers,
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        let msg = "Không cập nhật được phiếu xuất NCC";
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json: ApiResponse<SupplierExport> = await res.json();
    return json.data;
}

/* Xác nhận xuất kho (PENDING → EXPORTED) */
export async function confirmSupplierExport(id: number): Promise<SupplierExport> {
    const url = `${API_BASE}/api/exports/suppliers/${id}/confirm`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        let msg = "Không xác nhận được phiếu xuất";
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json: ApiResponse<SupplierExport> = await res.json();
    return json.data;
}

/* Hủy phiếu xuất (PENDING → CANCELLED) */
export async function cancelSupplierExport(id: number): Promise<SupplierExport> {
    const url = `${API_BASE}/api/exports/suppliers/${id}/cancel`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        let msg = "Không hủy được phiếu xuất";
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json: ApiResponse<SupplierExport> = await res.json();
    return json.data;
}

/* ============================================================
   IMPORT NCC
============================================================ */

export interface SupplierImportDetail {
    id?: number;
    importDetailId?: number;

    productId: number;
    productCode?: string | null;
    productName?: string | null;

    unit?: string | null;
    unitName?: string | null;

    storeId?: number; // Kho nhập cho dòng này
    storeName?: string | null;
    storeCode?: string | null;

    quantity: number;
    unitPrice: number;
    discountPercent?: number;
}

export interface SupplierImport {
    id: number;
    code: string;

    storeId: number;
    storeName?: string | null;
    storeCode?: string | null;
    supplierId: number;

    supplierName: string | null;
    supplierCode?: string | null;
    supplierPhone?: string | null;
    supplierAddress?: string | null;

    status: ExportStatus;
    importsDate: string;

    note: string | null;
    description?: string | null;

    totalValue: number;
    attachmentImages?: string[];
    items?: SupplierImportDetail[];
    // Audit (optional)
    createdBy?: string | null;
    createdByName?: string | null;
    createdAt?: string | null;
    createdDate?: string | null;
    approvedBy?: string | null;
    approvedByName?: string | null;
    approvedAt?: string | null;
    rejectedBy?: string | null;
    rejectedByName?: string | null;
    rejectedAt?: string | null;
    importedBy?: string | null;
    importedByName?: string | null;
    importedAt?: string | null;
}

export interface SupplierImportItemRequest {
    productId: number;
    quantity: number;
    unitPrice: number;
}

export interface SupplierImportCreateRequest {
    code?: string;
    storeId: number;
    supplierId: number;
    note?: string;
    description?: string;
    attachmentImages?: string[];
    items: SupplierImportItemRequest[];
}

/* Lấy danh sách phiếu nhập NCC */
export async function getSupplierImports(params?: {
    status?: ExportStatus | "ALL";
    code?: string;
    fromDate?: string;
    toDate?: string;
}): Promise<SupplierImport[]> {
    const qs = new URLSearchParams();

    if (params?.status && params.status !== "ALL") {
        qs.set("status", params.status);
    }
    if (params?.code) qs.set("code", params.code);
    if (params?.fromDate) qs.set("from", params.fromDate);
    if (params?.toDate) qs.set("to", params.toDate);

    const url =
        `${API_BASE}/api/imports/suppliers` +
        (qs.toString() ? `?${qs.toString()}` : "");

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        throw new Error("Không lấy được danh sách phiếu nhập NCC");
    }

    const json: ApiResponse<SupplierImport[]> = await res.json();
    return json.data;
}

/* Tạo phiếu nhập NCC */
export async function createSupplierImport(
    payload: SupplierImportCreateRequest,
): Promise<SupplierImport> {
    const url = `${API_BASE}/api/imports/suppliers`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        let msg = "Không tạo được phiếu nhập NCC";
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json: ApiResponse<SupplierImport> = await res.json();
    return json.data;
}

/* Lấy chi tiết phiếu nhập */
export async function getSupplierImportById(
    id: number,
): Promise<SupplierImport> {
    // Thử thêm query param để backend include items
    const url = `${API_BASE}/api/imports/suppliers/${id}?includeDetails=true`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        throw new Error("Không lấy được chi tiết phiếu nhập NCC");
    }

    const json: ApiResponse<SupplierImport> = await res.json();
    return json.data;
}

/* Lấy chi tiết sản phẩm của phiếu nhập */
export async function getSupplierImportDetails(
    id: number,
): Promise<SupplierImportDetail[]> {
    const url = `${API_BASE}/api/imports/suppliers/${id}/details`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        // Nếu endpoint không tồn tại, trả về mảng rỗng
        console.warn("Không lấy được chi tiết sản phẩm của phiếu nhập");
        return [];
    }

    const json: ApiResponse<SupplierImportDetail[]> = await res.json();
    return json.data;
}

/* Wrapper cho trang EDIT – cho đúng tên hàm đang dùng ở FE */
export async function getSupplierImport(
    id: number,
): Promise<SupplierImport> {
    return getSupplierImportById(id);
}

/* Cập nhật phiếu nhập */
export async function updateSupplierImport(
    id: number,
    payload: SupplierImportCreateRequest,
): Promise<SupplierImport> {
    const url = `${API_BASE}/api/imports/suppliers/${id}`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "PUT",
        credentials: "include",
        headers,
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        let msg = "Không cập nhật được phiếu nhập NCC";
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json: ApiResponse<SupplierImport> = await res.json();
    return json.data;
}

/* Xác nhận nhập kho (PENDING → IMPORTED) */
export async function confirmSupplierImport(id: number): Promise<SupplierImport> {
    const url = `${API_BASE}/api/imports/suppliers/${id}/confirm`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        let msg = "Không xác nhận được phiếu nhập";
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json: ApiResponse<SupplierImport> = await res.json();
    return json.data;
}

/* Hủy phiếu nhập (PENDING → CANCELLED) */
export async function cancelSupplierImport(id: number): Promise<SupplierImport> {
    const url = `${API_BASE}/api/imports/suppliers/${id}/cancel`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        let msg = "Không hủy được phiếu nhập";
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json: ApiResponse<SupplierImport> = await res.json();
    return json.data;
}

/* ============================================================
   IMPORT NỘI BỘ (INTERNAL IMPORTS)
============================================================ */

export interface InternalImportDetail {
    id?: number;
    importDetailId?: number;
    productId: number;
    productCode?: string | null;
    productName?: string | null;
    unit?: string | null;
    unitName?: string | null;
    quantity: number;
    unitPrice: number;
}

export interface InternalImport {
    id: number;
    code: string;
    storeId: number;
    sourceStoreId: number;  // Kho nguồn (nội bộ)
    sourceStoreName?: string | null;
    sourceStoreCode?: string | null;
    sourceStorePhone?: string | null;
    sourceStoreAddress?: string | null;
    status: ExportStatus;
    importsDate: string;
    note: string | null;
    description?: string | null;
    totalValue: number;
    attachmentImages?: string[];
    items?: InternalImportDetail[];
}

export interface InternalImportItemRequest {
    productId: number;
    quantity: number;
    unitPrice: number;
}

export interface InternalImportCreateRequest {
    code?: string;
    storeId: number;
    sourceStoreId: number;  // Kho nguồn
    note?: string;
    description?: string;
    attachmentImages?: string[];
    items: InternalImportItemRequest[];
}

/* Lấy danh sách phiếu nhập nội bộ */
export async function getInternalImports(params?: {
    status?: ExportStatus | "ALL";
    code?: string;
    fromDate?: string;
    toDate?: string;
}): Promise<InternalImport[]> {
    const qs = new URLSearchParams();

    if (params?.status && params.status !== "ALL") {
        qs.set("status", params.status);
    }
    if (params?.code) qs.set("code", params.code);
    if (params?.fromDate) qs.set("from", params.fromDate);
    if (params?.toDate) qs.set("to", params.toDate);

    const url =
        `${API_BASE}/api/imports/internal` +
        (qs.toString() ? `?${qs.toString()}` : "");

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        throw new Error("Không lấy được danh sách phiếu nhập nội bộ");
    }

    const json: ApiResponse<InternalImport[]> = await res.json();
    return json.data;
}

/* Tạo phiếu nhập nội bộ */
export async function createInternalImport(
    payload: InternalImportCreateRequest,
): Promise<InternalImport> {
    const url = `${API_BASE}/api/imports/internal`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        let msg = "Không tạo được phiếu nhập nội bộ";
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json: ApiResponse<InternalImport> = await res.json();
    return json.data;
}

/* Lấy chi tiết phiếu nhập nội bộ */
export async function getInternalImportById(
    id: number,
): Promise<InternalImport> {
    const url = `${API_BASE}/api/imports/internal/${id}?includeDetails=true`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        throw new Error("Không lấy được chi tiết phiếu nhập nội bộ");
    }

    const json: ApiResponse<InternalImport> = await res.json();
    return json.data;
}

/* Cập nhật phiếu nhập nội bộ */
export async function updateInternalImport(
    id: number,
    payload: InternalImportCreateRequest,
): Promise<InternalImport> {
    const url = `${API_BASE}/api/imports/internal/${id}`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "PUT",
        credentials: "include",
        headers,
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        let msg = "Không cập nhật được phiếu nhập nội bộ";
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json: ApiResponse<InternalImport> = await res.json();
    return json.data;
}

/* Xác nhận nhập kho nội bộ (PENDING → IMPORTED) */
export async function confirmInternalImport(id: number): Promise<InternalImport> {
    const url = `${API_BASE}/api/imports/internal/${id}/confirm`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        let msg = "Không xác nhận được phiếu nhập nội bộ";
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json: ApiResponse<InternalImport> = await res.json();
    return json.data;
}

/* Hủy phiếu nhập nội bộ (PENDING → CANCELLED) */
export async function cancelInternalImport(id: number): Promise<InternalImport> {
    const url = `${API_BASE}/api/imports/internal/${id}/cancel`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        let msg = "Không hủy được phiếu nhập nội bộ";
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json: ApiResponse<InternalImport> = await res.json();
    return json.data;
}

/* ============================================================
   LẤY DANH SÁCH LÔ NHẬP THEO SẢN PHẨM (cho phiếu xuất)
============================================================ */
export interface ImportLot {
    importDetailsId: number;
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: number;
    importsDate: string;
}

export async function getImportLotsByProduct(
    productId: number,
): Promise<ImportLot[]> {
    const url = `${API_BASE}/api/imports/suppliers/lots?productId=${productId}`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        throw new Error("Không lấy được danh sách lô nhập");
    }

    const json: ApiResponse<ImportLot[]> = await res.json();
    return json.data;
}

/* ============================================================
   XUẤT NỘI BỘ (INTERNAL EXPORTS)
============================================================ */

export interface InternalExportDetail {
    id?: number;
    exportDetailId?: number;
    importDetailsId?: number;
    productId: number;
    productCode?: string | null;
    productName?: string | null;
    unit?: string | null;
    unitName?: string | null;
    quantity: number;
    unitPrice: number;
    discount?: number;
    discountPercent?: number;
}

export interface InternalExport {
    id: number;
    code: string;
    storeId: number;  // Kho đích (kho nhận hàng)
    supplierId: number;  // Kho nguồn (sourceStoreId - nơi xuất hàng)
    targetStoreId: number;  // Deprecated: dùng supplierId thay thế
    targetStoreName?: string | null;
    targetStoreCode?: string | null;
    targetStorePhone?: string | null;
    targetStoreAddress?: string | null;
    // Backend map thông tin kho nguồn vào supplier fields
    supplierName?: string | null;
    supplierCode?: string | null;
    supplierPhone?: string | null;
    supplierAddress?: string | null;
    status: ExportStatus;
    exportsDate: string;
    note: string | null;
    description?: string | null;
    totalValue: number;
    attachmentImages?: string[];
    items?: InternalExportDetail[];
}

export interface InternalExportItemRequest {
    importDetailsId?: number;
    productId: number;
    quantity: number;
    unitPrice: number;
    discountPercent?: number;   // ⭐ THÊM: Phần trăm chiết khấu
}

export interface InternalExportCreateRequest {
    code?: string;
    storeId: number;
    targetStoreId: number;  // Kho đích
    note?: string;
    description?: string;
    attachmentImages?: string[];
    items: InternalExportItemRequest[];
}

/* Lấy danh sách phiếu xuất nội bộ */
export async function getInternalExports(params?: {
    status?: ExportStatus | "ALL";
    code?: string;
    fromDate?: string;
    toDate?: string;
}): Promise<InternalExport[]> {
    const qs = new URLSearchParams();

    if (params?.status && params.status !== "ALL") {
        qs.set("status", params.status);
    }
    if (params?.code) qs.set("code", params.code);
    if (params?.fromDate) qs.set("fromDate", params.fromDate);
    if (params?.toDate) qs.set("toDate", params.toDate);

    const url =
        `${API_BASE}/api/exports/internal` +
        (qs.toString() ? `?${qs.toString()}` : "");

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        throw new Error("Không lấy được danh sách phiếu xuất nội bộ");
    }

    const json: ApiResponse<InternalExport[]> = await res.json();
    return json.data;
}

/* Tạo phiếu xuất nội bộ */
export async function createInternalExport(
    payload: InternalExportCreateRequest,
): Promise<InternalExport> {
    const url = `${API_BASE}/api/exports/internal`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        let msg = "Không tạo được phiếu xuất nội bộ";
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json: ApiResponse<InternalExport> = await res.json();
    return json.data;
}

/* Lấy chi tiết phiếu xuất nội bộ */
export async function getInternalExportById(
    id: number,
): Promise<InternalExport> {
    const url = `${API_BASE}/api/exports/internal/${id}?includeDetails=true`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        throw new Error("Không lấy được chi tiết phiếu xuất nội bộ");
    }

    const json: ApiResponse<InternalExport> = await res.json();
    return json.data;
}

/* Cập nhật phiếu xuất nội bộ */
export async function updateInternalExport(
    id: number,
    payload: InternalExportCreateRequest,
): Promise<InternalExport> {
    const url = `${API_BASE}/api/exports/internal/${id}`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "PUT",
        credentials: "include",
        headers,
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        let msg = "Không cập nhật được phiếu xuất nội bộ";
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json: ApiResponse<InternalExport> = await res.json();
    return json.data;
}

/* Xác nhận xuất kho nội bộ (PENDING → EXPORTED) */
export async function confirmInternalExport(id: number): Promise<InternalExport> {
    const url = `${API_BASE}/api/exports/internal/${id}/confirm`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        let msg = "Không xác nhận được phiếu xuất nội bộ";
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json: ApiResponse<InternalExport> = await res.json();
    return json.data;
}

/* Hủy phiếu xuất nội bộ (PENDING → CANCELLED) */
export async function cancelInternalExport(id: number): Promise<InternalExport> {
    const url = `${API_BASE}/api/exports/internal/${id}/cancel`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        let msg = "Không hủy được phiếu xuất nội bộ";
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json: ApiResponse<InternalExport> = await res.json();
    return json.data;
}

/* ============================================================
   PHIẾU NHẬP NHÂN VIÊN (STAFF IMPORTS)
============================================================ */

export interface StaffImportDetail {
    id?: number;
    importDetailId?: number;
    productId: number;
    productCode?: string | null;
    productName?: string | null;
    unit?: string | null;
    unitName?: string | null;
    quantity: number;
    unitPrice: number;
}

export interface StaffImport {
    id: number;
    code: string;
    storeId: number;
    staffId: number;
    staffName?: string | null;
    staffCode?: string | null;
    staffPhone?: string | null;
    staffAddress?: string | null;
    status: ExportStatus;
    importsDate: string;
    note: string | null;
    description?: string | null;
    totalValue: number;
    attachmentImages?: string[];
    items?: StaffImportDetail[];
}

export interface StaffImportItemRequest {
    productId: number;
    quantity: number;
    unitPrice: number;
}

export interface StaffImportCreateRequest {
    code?: string;
    storeId: number;
    staffId: number;
    note?: string;
    description?: string;
    attachmentImages?: string[];
    items: StaffImportItemRequest[];
}

/* Lấy danh sách phiếu nhập nhân viên */
export async function getStaffImports(params?: {
    status?: ExportStatus | "ALL";
    code?: string;
    fromDate?: string;
    toDate?: string;
}): Promise<StaffImport[]> {
    const qs = new URLSearchParams();

    if (params?.status && params.status !== "ALL") {
        qs.set("status", params.status);
    }
    if (params?.code) qs.set("code", params.code);
    if (params?.fromDate) qs.set("from", params.fromDate);
    if (params?.toDate) qs.set("to", params.toDate);

    const url =
        `${API_BASE}/api/imports/staff` +
        (qs.toString() ? `?${qs.toString()}` : "");

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        throw new Error("Không lấy được danh sách phiếu nhập nhân viên");
    }

    const json: ApiResponse<StaffImport[]> = await res.json();
    return json.data;
}

/* Tạo phiếu nhập nhân viên */
export async function createStaffImport(
    payload: StaffImportCreateRequest,
): Promise<StaffImport> {
    const url = `${API_BASE}/api/imports/staff`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        let msg = "Không tạo được phiếu nhập nhân viên";
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json: ApiResponse<StaffImport> = await res.json();
    return json.data;
}

/* Lấy chi tiết phiếu nhập nhân viên */
export async function getStaffImportById(
    id: number,
): Promise<StaffImport> {
    const url = `${API_BASE}/api/imports/staff/${id}?includeDetails=true`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        throw new Error("Không lấy được chi tiết phiếu nhập nhân viên");
    }

    const json: ApiResponse<StaffImport> = await res.json();
    return json.data;
}

/* Cập nhật phiếu nhập nhân viên */
export async function updateStaffImport(
    id: number,
    payload: StaffImportCreateRequest,
): Promise<StaffImport> {
    const url = `${API_BASE}/api/imports/staff/${id}`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "PUT",
        credentials: "include",
        headers,
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        let msg = "Không cập nhật được phiếu nhập nhân viên";
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json: ApiResponse<StaffImport> = await res.json();
    return json.data;
}

/* Xác nhận nhập kho nhân viên (PENDING → IMPORTED) */
export async function confirmStaffImport(id: number): Promise<StaffImport> {
    const url = `${API_BASE}/api/imports/staff/${id}/confirm`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        let msg = "Không xác nhận được phiếu nhập nhân viên";
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json: ApiResponse<StaffImport> = await res.json();
    return json.data;
}

/* Hủy phiếu nhập nhân viên (PENDING → CANCELLED) */
export async function cancelStaffImport(id: number): Promise<StaffImport> {
    const url = `${API_BASE}/api/imports/staff/${id}/cancel`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        let msg = "Không hủy được phiếu nhập nhân viên";
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json: ApiResponse<StaffImport> = await res.json();
    return json.data;
}

/* ============================================================
   PHIẾU XUẤT NHÂN VIÊN (STAFF EXPORTS)
============================================================ */

export interface StaffExportDetail {
    id?: number;
    exportDetailId?: number;
    importDetailsId?: number;
    productId: number;
    productCode?: string | null;
    productName?: string | null;
    unit?: string | null;
    unitName?: string | null;
    quantity: number;
    unitPrice: number;
    discount?: number;
}

export interface StaffExport {
    id: number;
    code: string;
    storeId: number;
    staffId: number;
    staffName?: string | null;
    staffCode?: string | null;
    staffPhone?: string | null;
    staffAddress?: string | null;
    status: ExportStatus;
    exportsDate: string;
    note: string | null;
    description?: string | null;
    totalValue: number;
    attachmentImages?: string[];
    items?: StaffExportDetail[];
}

export interface StaffExportItemRequest {
    importDetailsId?: number;
    productId: number;
    quantity: number;
    unitPrice: number;
    discount?: number;
}

export interface StaffExportCreateRequest {
    code?: string;
    storeId: number;
    staffId: number;
    note?: string;
    description?: string;
    attachmentImages?: string[];
    items: StaffExportItemRequest[];
}

/* Lấy danh sách phiếu xuất nhân viên */
export async function getStaffExports(params?: {
    status?: ExportStatus | "ALL";
    code?: string;
    fromDate?: string;
    toDate?: string;
}): Promise<StaffExport[]> {
    const qs = new URLSearchParams();

    if (params?.status && params.status !== "ALL") {
        qs.set("status", params.status);
    }
    if (params?.code) qs.set("code", params.code);
    if (params?.fromDate) qs.set("fromDate", params.fromDate);
    if (params?.toDate) qs.set("toDate", params.toDate);

    const url =
        `${API_BASE}/api/exports/staff` +
        (qs.toString() ? `?${qs.toString()}` : "");

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        throw new Error("Không lấy được danh sách phiếu xuất nhân viên");
    }

    const json: ApiResponse<StaffExport[]> = await res.json();
    return json.data;
}

/* Tạo phiếu xuất nhân viên */
export async function createStaffExport(
    payload: StaffExportCreateRequest,
): Promise<StaffExport> {
    const url = `${API_BASE}/api/exports/staff`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        let msg = "Không tạo được phiếu xuất nhân viên";
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json: ApiResponse<StaffExport> = await res.json();
    return json.data;
}

/* Lấy chi tiết phiếu xuất nhân viên */
export async function getStaffExportById(
    id: number,
): Promise<StaffExport> {
    const url = `${API_BASE}/api/exports/staff/${id}?includeDetails=true`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        throw new Error("Không lấy được chi tiết phiếu xuất nhân viên");
    }

    const json: ApiResponse<StaffExport> = await res.json();
    return json.data;
}

/* Cập nhật phiếu xuất nhân viên */
export async function updateStaffExport(
    id: number,
    payload: StaffExportCreateRequest,
): Promise<StaffExport> {
    const url = `${API_BASE}/api/exports/staff/${id}`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "PUT",
        credentials: "include",
        headers,
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        let msg = "Không cập nhật được phiếu xuất nhân viên";
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json: ApiResponse<StaffExport> = await res.json();
    return json.data;
}

/* Xác nhận xuất kho nhân viên (PENDING → EXPORTED) */
export async function confirmStaffExport(id: number): Promise<StaffExport> {
    const url = `${API_BASE}/api/exports/staff/${id}/confirm`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        let msg = "Không xác nhận được phiếu xuất nhân viên";
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json: ApiResponse<StaffExport> = await res.json();
    return json.data;
}

/* Hủy phiếu xuất nhân viên (PENDING → CANCELLED) */
export async function cancelStaffExport(id: number): Promise<StaffExport> {
    const url = `${API_BASE}/api/exports/staff/${id}/cancel`;

    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        let msg = "Không hủy được phiếu xuất nhân viên";
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json: ApiResponse<StaffExport> = await res.json();
    return json.data;
}

/* ============================================================
   KIỂM KÊ KHO (INVENTORY CHECKS)
============================================================ */

export type InventoryCheckStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface InventoryCheckDetail {
    id?: number;
    checkDetailId?: number;
    productId: number;
    productCode?: string | null;
    productName?: string | null;
    unit?: string | null;
    unitName?: string | null;
    systemQuantity: number;
    actualQuantity: number;
    differenceQuantity: number;
    unitPrice: number;
    totalValue: number;
    note?: string | null;
}

export interface InventoryCheck {
    id: number;
    checkCode: string;
    storeId: number;
    storeName?: string | null;
    storeCode?: string | null;
    description?: string | null;
    status: InventoryCheckStatus;
    checkDate: string;
    note?: string | null;
    totalDifferenceValue: number;
    createdAt?: string;
    updatedAt?: string;
    items?: InventoryCheckDetail[];
}

export interface InventoryCheckDetailRequest {
    productId: number;
    systemQuantity: number;
    actualQuantity: number;
    unitPrice: number;
    note?: string;
}

export interface InventoryCheckCreateRequest {
    checkCode?: string;
    storeId: number;
    description?: string;
    checkDate: string;
    note?: string;
    items: InventoryCheckDetailRequest[];
}

export interface InventoryCheckRejectRequest {
    reason: string;
}

/* Lấy danh sách phiếu kiểm kê */
export async function getInventoryChecks(params?: {
    status?: InventoryCheckStatus | 'ALL';
    checkCode?: string;
    fromDate?: string;
    toDate?: string;
}): Promise<InventoryCheck[]> {
    const qs = new URLSearchParams();

    if (params?.status && params.status !== 'ALL') {
        qs.set('status', params.status);
    }
    if (params?.checkCode) qs.set('checkCode', params.checkCode);
    if (params?.fromDate) qs.set('fromDate', params.fromDate);
    if (params?.toDate) qs.set('toDate', params.toDate);

    const url =
        `${API_BASE}/api/inventory-checks` +
        (qs.toString() ? `?${qs.toString()}` : '');

    const token = getToken();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers,
    });

    if (!res.ok) {
        throw new Error('Không lấy được danh sách phiếu kiểm kê');
    }

    const json: ApiResponse<InventoryCheck[]> = await res.json();
    return json.data;
}

export async function searchInventoryChecksPaged(params?: {
    status?: InventoryCheckStatus | 'ALL';
    checkCode?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    size?: number;
}): Promise<PageResponse<InventoryCheck>> {
    const qs = new URLSearchParams();

    if (params?.status && params.status !== 'ALL') {
        qs.set('status', params.status);
    }
    if (params?.checkCode) qs.set('checkCode', params.checkCode);
    if (params?.fromDate) qs.set('fromDate', params.fromDate);
    if (params?.toDate) qs.set('toDate', params.toDate);
    if (typeof params?.page === 'number') qs.set('page', String(params.page));
    if (typeof params?.size === 'number') qs.set('size', String(params.size));

    const url =
        `${API_BASE}/api/inventory-checks/search` +
        (qs.toString() ? `?${qs.toString()}` : '');

    const token = getToken();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers,
    });

    if (!res.ok) {
        throw new Error('Không lấy được danh sách phiếu kiểm kê (phân trang)');
    }

    const json: ApiResponse<PageResponse<InventoryCheck>> = await res.json();
    return json.data;
}

/* Tạo phiếu kiểm kê */
export async function createInventoryCheck(
    payload: InventoryCheckCreateRequest,
): Promise<InventoryCheck> {
    const url = `${API_BASE}/api/inventory-checks`;

    const token = getToken();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        let msg = 'Không tạo được phiếu kiểm kê';
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json: ApiResponse<InventoryCheck> = await res.json();
    return json.data;
}

/* Lấy chi tiết phiếu kiểm kê */
export async function getInventoryCheckById(
    id: number,
): Promise<InventoryCheck> {
    const url = `${API_BASE}/api/inventory-checks/${id}`;

    const token = getToken();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers,
    });

    if (!res.ok) {
        throw new Error('Không lấy được chi tiết phiếu kiểm kê');
    }

    const json: ApiResponse<InventoryCheck> = await res.json();
    return json.data;
}

/* Cập nhật phiếu kiểm kê */
export async function updateInventoryCheck(
    id: number,
    payload: InventoryCheckCreateRequest,
): Promise<InventoryCheck> {
    const url = `${API_BASE}/api/inventory-checks/${id}`;

    const token = getToken();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: 'PUT',
        credentials: 'include',
        headers,
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        let msg = 'Không cập nhật được phiếu kiểm kê';
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json: ApiResponse<InventoryCheck> = await res.json();
    return json.data;
}

/* Duyệt phiếu kiểm kê (PENDING → APPROVED) */
export async function approveInventoryCheck(id: number): Promise<InventoryCheck> {
    const url = `${API_BASE}/api/inventory-checks/${id}/approve`;

    const token = getToken();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers,
    });

    if (!res.ok) {
        let msg = 'Không duyệt được phiếu kiểm kê';
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json: ApiResponse<InventoryCheck> = await res.json();
    return json.data;
}

/* Xác nhận phiếu kiểm kê (APPROVED → hoàn thành, chỉ Admin) */
export async function confirmInventoryCheck(id: number): Promise<InventoryCheck> {
    const url = `${API_BASE}/api/inventory-checks/${id}/confirm`;

    const token = getToken();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers,
    });

    if (!res.ok) {
        let msg = 'Không xác nhận được phiếu kiểm kê';
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json: ApiResponse<InventoryCheck> = await res.json();
    return json.data;
}

/* Từ chối phiếu kiểm kê (PENDING → REJECTED) */
export async function rejectInventoryCheck(
    id: number,
    payload: InventoryCheckRejectRequest,
): Promise<InventoryCheck> {
    const url = `${API_BASE}/api/inventory-checks/${id}/reject`;

    const token = getToken();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        let msg = 'Không từ chối được phiếu kiểm kê';
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json: ApiResponse<InventoryCheck> = await res.json();
    return json.data;
}

/* Xóa phiếu kiểm kê */
export async function deleteInventoryCheck(id: number): Promise<void> {
    const url = `${API_BASE}/api/inventory-checks/${id}`;

    const token = getToken();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: 'DELETE',
        credentials: 'include',
        headers,
    });

    if (!res.ok) {
        let msg = 'Không xóa được phiếu kiểm kê';
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) msg = j.message;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }
}
