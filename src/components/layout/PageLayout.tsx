// src/components/layout/PageLayout.tsx
'use client';

import { ReactNode } from 'react';
import Sidebar from './Sidebar';

interface PageLayoutProps {
    children: ReactNode;
    className?: string;
}

export default function PageLayout({ children, className = '' }: PageLayoutProps) {
    return (
        <div className="min-h-screen">
            <Sidebar />
            <main className={`ml-[264px] mt-6 p-6 pr-12 ${className}`}>
                {children}
            </main>
        </div>
    );
}

