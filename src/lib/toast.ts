import toast from 'react-hot-toast';

// Helper function to safely convert error to string
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object') {
    // Try to extract message from common error response formats
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
    if ('error' in error && typeof error.error === 'string') {
      return error.error;
    }
    if ('data' in error && error.data && typeof error.data === 'object') {
      if ('message' in error.data && typeof error.data.message === 'string') {
        return error.data.message;
      }
    }
    // Last resort: try JSON.stringify
    try {
      const jsonStr = JSON.stringify(error);
      if (jsonStr !== '{}') {
        return jsonStr;
      }
    } catch {
      // Ignore JSON.stringify errors
    }
  }
  return 'Đã xảy ra lỗi không xác định';
};

export const showToast = {
  success: (message: string) => {
    toast.success(message, {
      duration: 4000,
    });
  },
  error: (message: unknown) => {
    const errorMessage = typeof message === 'string' ? message : getErrorMessage(message);
    toast.error(errorMessage, {
      duration: 5000,
    });
  },
  info: (message: string) => {
    toast(message, {
      icon: 'ℹ️',
      duration: 4000,
    });
  },
  loading: (message: string) => {
    return toast.loading(message);
  },
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    }
  ) => {
    return toast.promise(promise, messages);
  },
};

