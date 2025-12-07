// Permission constants
export const PERMISSIONS = {
  // Import permissions
  IMPORT_CREATE: 'IMPORT_CREATE',
  IMPORT_EDIT: 'IMPORT_EDIT',
  IMPORT_DELETE: 'IMPORT_DELETE',
  IMPORT_APPROVE: 'IMPORT_APPROVE',
  IMPORT_REJECT: 'IMPORT_REJECT',
  IMPORT_CANCEL: 'IMPORT_CANCEL',
  IMPORT_VIEW: 'IMPORT_VIEW',
  
  // Export permissions
  EXPORT_CREATE: 'EXPORT_CREATE',
  EXPORT_EDIT: 'EXPORT_EDIT',
  EXPORT_DELETE: 'EXPORT_DELETE',
  EXPORT_APPROVE: 'EXPORT_APPROVE',
  EXPORT_REJECT: 'EXPORT_REJECT',
  EXPORT_CANCEL: 'EXPORT_CANCEL',
  EXPORT_VIEW: 'EXPORT_VIEW',
  
  // Inventory check permissions
  INVENTORY_CHECK_CREATE: 'INVENTORY_CHECK_CREATE',
  INVENTORY_CHECK_EDIT: 'INVENTORY_CHECK_EDIT',
  INVENTORY_CHECK_DELETE: 'INVENTORY_CHECK_DELETE',
  INVENTORY_CHECK_APPROVE: 'INVENTORY_CHECK_APPROVE',
  INVENTORY_CHECK_CONFIRM: 'INVENTORY_CHECK_CONFIRM',
  INVENTORY_CHECK_VIEW: 'INVENTORY_CHECK_VIEW',
} as const;

// Role-based permission mapping
const ROLE_PERMISSIONS: Record<string, string[]> = {
  // Admin có tất cả quyền
  ADMIN: Object.values(PERMISSIONS),
  
  // Manager có quyền duyệt, từ chối, và tạo
  MANAGER: [
    PERMISSIONS.IMPORT_CREATE,        // ✅ Thêm quyền tạo
    PERMISSIONS.IMPORT_APPROVE,
    PERMISSIONS.IMPORT_REJECT,
    PERMISSIONS.IMPORT_VIEW,
    PERMISSIONS.EXPORT_CREATE,        // ✅ Thêm quyền tạo
    PERMISSIONS.EXPORT_APPROVE,
    PERMISSIONS.EXPORT_REJECT,
    PERMISSIONS.EXPORT_VIEW,
    PERMISSIONS.INVENTORY_CHECK_CREATE, // ✅ Thêm quyền tạo
    PERMISSIONS.INVENTORY_CHECK_APPROVE,
    PERMISSIONS.INVENTORY_CHECK_VIEW,
  ],
  
  // Staff chỉ có quyền tạo và xem
  STAFF: [
    PERMISSIONS.IMPORT_CREATE,
    PERMISSIONS.IMPORT_VIEW,
    PERMISSIONS.EXPORT_CREATE,
    PERMISSIONS.EXPORT_VIEW,
    PERMISSIONS.INVENTORY_CHECK_CREATE,
    PERMISSIONS.INVENTORY_CHECK_VIEW,
  ],
  
  // User chỉ có quyền xem
  USER: [
    PERMISSIONS.IMPORT_VIEW,
    PERMISSIONS.EXPORT_VIEW,
    PERMISSIONS.INVENTORY_CHECK_VIEW,
  ],
};

/**
 * Kiểm tra xem user có quyền thực hiện một hành động không
 */
export function hasPermission(userRoles: string[], permission: string): boolean {
  if (!userRoles || userRoles.length === 0) return false;
  
  // Kiểm tra từng role của user
  for (const role of userRoles) {
    const roleUpper = role.toUpperCase();
    const permissions = ROLE_PERMISSIONS[roleUpper] || [];
    
    // Nếu role có quyền này hoặc là ADMIN
    if (permissions.includes(permission) || roleUpper === 'ADMIN') {
      return true;
    }
  }
  
  return false;
}

/**
 * Kiểm tra xem user có một trong các roles được chỉ định không
 */
export function hasRole(userRoles: string[], allowedRoles: string[]): boolean {
  if (!userRoles || userRoles.length === 0) return false;
  
  const userRolesUpper = userRoles.map(r => r.toUpperCase());
  const allowedRolesUpper = allowedRoles.map(r => r.toUpperCase());
  
  return userRolesUpper.some(role => allowedRolesUpper.includes(role));
}

