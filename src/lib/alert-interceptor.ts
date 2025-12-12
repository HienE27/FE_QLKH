// Intercept window.alert and window.confirm to use toast/confirm modal instead
// This prevents [object Object] errors from native alerts

// Helper to safely convert any value to string
function safeStringify(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof Error) {
    return value.message || value.toString();
  }
  if (typeof value === 'object') {
    // Try to extract message from common error response formats
    if ('message' in value && typeof value.message === 'string') {
      return value.message;
    }
    if ('error' in value && typeof value.error === 'string') {
      return value.error;
    }
    if ('data' in value && value.data && typeof value.data === 'object') {
      if ('message' in value.data && typeof value.data.message === 'string') {
        return value.data.message;
      }
    }
    // Last resort: try JSON.stringify
    try {
      const jsonStr = JSON.stringify(value);
      if (jsonStr !== '{}' && jsonStr !== 'null' && jsonStr !== 'undefined') {
        return jsonStr;
      }
    } catch {
      // Ignore JSON.stringify errors
    }
  }
  return String(value);
}

// Only override if window is available
if (typeof window !== 'undefined') {
  // Store original functions
  const originalAlert = window.alert;

  // Override window.alert immediately
  window.alert = function (message?: unknown): void {
    const messageStr = safeStringify(message) || 'Đã xảy ra lỗi';
    
    // Try to use toast if available, otherwise fallback to console
    try {
      // Check if toast is available (from react-hot-toast)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (typeof window !== 'undefined' && (window as Record<string, unknown>).__toast) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((window as Record<string, unknown>).__toast as { error: (msg: string) => void }).error(messageStr);
        return;
      }
      
      // Try dynamic import
      import('./toast').then(({ showToast }) => {
        showToast.error(messageStr);
      }).catch(() => {
        // Fallback to console if toast fails to load
        console.error('Alert intercepted:', messageStr);
        // Also try to show in a more user-friendly way
        if (originalAlert) {
          originalAlert(messageStr);
        }
      });
    } catch {
      // Ultimate fallback
      console.error('Alert intercepted:', messageStr);
      if (originalAlert) {
        originalAlert(messageStr);
      }
    }
  };

  // Override window.confirm
  window.confirm = function (message?: string): boolean {
    // For confirm, we'll show a toast and return false
    // Real confirm should use useConfirm hook
    if (message) {
      try {
        import('./toast').then(({ showToast }) => {
          showToast.info(message);
        }).catch(() => {
          console.warn('Confirm intercepted:', message);
        });
      } catch {
        console.warn('Confirm intercepted:', message);
      }
    }
    return false;
  };
}

