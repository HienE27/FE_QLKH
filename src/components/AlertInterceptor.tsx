'use client';

import { useEffect } from 'react';

export default function AlertInterceptor() {
  useEffect(() => {
    // Load interceptor on client side
    import('@/lib/alert-interceptor').catch(() => {
      // Ignore import errors
    });
  }, []);

  return null;
}

