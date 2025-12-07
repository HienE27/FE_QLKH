'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirect /profile -> /dashboard/profile to avoid duplicate routes
export default function ProfileRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/dashboard/profile');
    }, [router]);
    return null;
}

