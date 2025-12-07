'use client';

import { useEffect, useState } from 'react';
import { getToken } from '@/lib/auth';

export interface UserInfo {
  username: string;
  roles: string[];
  fullName?: string;
  email?: string;
}

export function useUser() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      // Decode JWT token để lấy thông tin user
      // Format: header.payload.signature
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        setUser({
          username: payload.sub || payload.username || '',
          roles: payload.roles || payload.authorities || [],
          fullName: payload.fullName || payload.name || payload.sub || '',
          email: payload.email || payload.sub || '',
        });
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error decoding token:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { user, loading };
}

