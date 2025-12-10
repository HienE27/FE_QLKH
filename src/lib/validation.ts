import { z } from 'zod';

// ============================================
// Product Validation Schemas
// ============================================

export const productSchema = z.object({
  name: z
    .string()
    .min(1, 'Tên hàng hóa là bắt buộc')
    .max(255, 'Tên hàng hóa không được vượt quá 255 ký tự'),
  categoryId: z
    .number({ required_error: 'Vui lòng chọn nhóm hàng' })
    .min(1, 'Vui lòng chọn nhóm hàng'),
  unitId: z
    .number({ required_error: 'Vui lòng chọn đơn vị tính' })
    .min(1, 'Vui lòng chọn đơn vị tính'),
  price: z
    .string()
    .min(1, 'Giá bán là bắt buộc')
    .refine(
      (val) => {
        const num = parseFloat(val.replace(/[^\d.]/g, ''));
        return !isNaN(num) && num >= 0;
      },
      { message: 'Giá bán phải là số hợp lệ và >= 0' }
    ),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  supplierId: z.number().optional(),
  selectedSupplierIds: z.array(z.number()).optional(),
});

export type ProductFormData = z.infer<typeof productSchema>;

// ============================================
// Supplier Validation Schemas
// ============================================

export const supplierSchema = z.object({
  name: z
    .string()
    .min(1, 'Tên nhà cung cấp là bắt buộc')
    .max(255, 'Tên nhà cung cấp không được vượt quá 255 ký tự'),
  code: z
    .string()
    .min(1, 'Mã nhà cung cấp là bắt buộc')
    .max(50, 'Mã nhà cung cấp không được vượt quá 50 ký tự'),
  email: z
    .string()
    .email('Email không hợp lệ')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .max(20, 'Số điện thoại không được vượt quá 20 ký tự')
    .optional()
    .or(z.literal('')),
  address: z.string().max(500, 'Địa chỉ không được vượt quá 500 ký tự').optional(),
  description: z.string().optional(),
});

export type SupplierFormData = z.infer<typeof supplierSchema>;

// ============================================
// Customer Validation Schemas
// ============================================

export const customerSchema = z.object({
  name: z
    .string()
    .min(1, 'Tên khách hàng là bắt buộc')
    .max(255, 'Tên khách hàng không được vượt quá 255 ký tự'),
  code: z
    .string()
    .min(1, 'Mã khách hàng là bắt buộc')
    .max(50, 'Mã khách hàng không được vượt quá 50 ký tự'),
  email: z
    .string()
    .email('Email không hợp lệ')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .max(20, 'Số điện thoại không được vượt quá 20 ký tự')
    .optional()
    .or(z.literal('')),
  address: z.string().max(500, 'Địa chỉ không được vượt quá 500 ký tự').optional(),
  description: z.string().optional(),
});

export type CustomerFormData = z.infer<typeof customerSchema>;

// ============================================
// Category Validation Schemas
// ============================================

export const categorySchema = z.object({
  name: z
    .string()
    .min(1, 'Tên danh mục là bắt buộc')
    .max(255, 'Tên danh mục không được vượt quá 255 ký tự'),
  code: z
    .string()
    .min(1, 'Mã danh mục là bắt buộc')
    .max(50, 'Mã danh mục không được vượt quá 50 ký tự'),
  description: z.string().optional(),
});

export type CategoryFormData = z.infer<typeof categorySchema>;

// ============================================
// Unit Validation Schemas
// ============================================

export const unitSchema = z.object({
  name: z
    .string()
    .min(1, 'Tên đơn vị tính là bắt buộc')
    .max(100, 'Tên đơn vị tính không được vượt quá 100 ký tự'),
  code: z
    .string()
    .min(1, 'Mã đơn vị tính là bắt buộc')
    .max(20, 'Mã đơn vị tính không được vượt quá 20 ký tự'),
  description: z.string().optional(),
});

export type UnitFormData = z.infer<typeof unitSchema>;

// ============================================
// Store Validation Schemas
// ============================================

export const storeSchema = z.object({
  name: z
    .string()
    .min(1, 'Tên kho hàng là bắt buộc')
    .max(255, 'Tên kho hàng không được vượt quá 255 ký tự'),
  code: z
    .string()
    .min(1, 'Mã kho hàng là bắt buộc')
    .max(50, 'Mã kho hàng không được vượt quá 50 ký tự'),
  address: z.string().max(500, 'Địa chỉ không được vượt quá 500 ký tự').optional(),
  description: z.string().optional(),
});

export type StoreFormData = z.infer<typeof storeSchema>;

// ============================================
// Stock Validation Schemas
// ============================================

export const stockSchema = z.object({
  productId: z.number().min(1, 'Vui lòng chọn sản phẩm'),
  storeId: z.number().min(1, 'Vui lòng chọn kho hàng'),
  quantity: z
    .number()
    .min(0, 'Số lượng phải >= 0')
    .or(z.string().refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    }, { message: 'Số lượng phải là số hợp lệ và >= 0' })),
  minStock: z
    .number()
    .min(0, 'Tồn kho tối thiểu phải >= 0')
    .optional()
    .or(z.string().optional().refine((val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    }, { message: 'Tồn kho tối thiểu phải là số hợp lệ và >= 0' })),
  maxStock: z
    .number()
    .min(0, 'Tồn kho tối đa phải >= 0')
    .optional()
    .or(z.string().optional().refine((val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    }, { message: 'Tồn kho tối đa phải là số hợp lệ và >= 0' })),
});

export type StockFormData = z.infer<typeof stockSchema>;

// ============================================
// Helper Functions
// ============================================

/**
 * Parse validation error to user-friendly message
 */
export function getValidationError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.errors.map((e) => e.message).join(', ');
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Có lỗi xảy ra khi xác thực dữ liệu';
}

/**
 * Get field-specific error message
 */
export function getFieldError(error: unknown, fieldName: string): string | undefined {
  if (error instanceof z.ZodError) {
    const fieldError = error.errors.find((e) => e.path.includes(fieldName));
    return fieldError?.message;
  }
  return undefined;
}

