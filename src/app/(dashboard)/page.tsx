'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getOrders } from '@/services/order.service';
import type { Order } from '@/types/order';
import { clearToken } from '@/lib/auth';

export default function DashboardPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = () => {
    clearToken();
    router.push('/login');
  };

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const data = await getOrders();
        if (isMounted) {
          setOrders(data);
        }
      } catch (err: unknown) {
        if (!isMounted) return;

        const message =
          err instanceof Error ? err.message : 'Lỗi tải đơn hàng';
        setError(message);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Danh sách đơn hàng</h1>
        <button
          onClick={handleLogout}
          className="px-3 py-1 rounded bg-sky-600 text-white text-sm"
        >
          Đăng xuất
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

      <table className="w-full text-sm border">
        <thead className="bg-slate-100">
          <tr>
            <th className="border px-2 py-1 text-left">ID</th>
            {/* thêm các cột khác sau */}
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td className="border px-2 py-1">{o.id}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
