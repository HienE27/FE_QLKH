// useAuth.ts
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/auth';

export function useAuth() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      // không có token -> đá ra login
      router.replace('/login');
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(false);
  }, [router]);

  return { loading };
}
