'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/services/auth.service';
import { saveToken } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('admin2');
  const [password, setPassword] = useState('Viethien1@');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await login({ username, password });

      if (!res.success) {
        setError(res.message || 'Login failed');
        return;
      }

      saveToken(res.data.token);
      router.push('/dashboard');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Có lỗi xảy ra');
      } else {
        setError('Có lỗi xảy ra');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white rounded-2xl shadow p-8 space-y-4"
      >
        <h1 className="text-2xl font-semibold text-center">
          Đăng nhập hệ thống Quản Lý Kho Hàng
        </h1>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="username"
            className="block text-sm font-medium mb-1"
          >
            Username
          </label>
          <input
            id="username"
            name="username"
            placeholder="Nhập username"
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-sky-300"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium mb-1"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Nhập mật khẩu"
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-sky-300"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-60"
        >
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>
    </div>
  );
}
