'use client';

import { ReactNode, useState } from 'react';
import {
  QueryClient,
  QueryClientProvider as TanstackQueryClientProvider,
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';

type Props = {
  children: ReactNode;
};

export function QueryClientProvider({ children }: Props) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 60 * 1000,
          },
        },
      }),
  );

  return (
    <TanstackQueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#1e293b',
            borderRadius: '0.75rem',
            padding: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid rgba(0, 0, 0, 0.05)',
            maxWidth: '420px',
          },
          className: 'toast-animation',
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff',
            },
            style: {
              borderLeft: '4px solid #22c55e',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
            style: {
              borderLeft: '4px solid #ef4444',
            },
          },
          loading: {
            iconTheme: {
              primary: '#0099FF',
              secondary: '#fff',
            },
            style: {
              borderLeft: '4px solid #0099FF',
            },
          },
        }}
      />
      <style jsx global>{`
        .toast-animation {
          animation: slideInRight 0.3s ease-out, fadeIn 0.3s ease-out;
        }
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        /* Progress bar for toast */
        .react-hot-toast > div {
          position: relative;
        }
        .react-hot-toast > div::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          height: 3px;
          background: linear-gradient(to right, #0099FF, #0088EE);
          border-radius: 0 0 0.75rem 0.75rem;
          animation: progressBar linear forwards;
        }
        @keyframes progressBar {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
      <ReactQueryDevtools initialIsOpen={false} />
    </TanstackQueryClientProvider>
  );
}

