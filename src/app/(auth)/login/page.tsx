'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/services/auth.service';
import { saveToken } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="relative min-h-screen bg-slate-950 text-slate-100">
      <div className="absolute inset-0">
        <div className="absolute -left-20 top-10 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-[32rem] w-[32rem] rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-2xl">
          <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
            <div className="relative hidden lg:flex flex-col justify-between bg-gradient-to-br from-sky-600 via-sky-500 to-cyan-400 p-10 text-white">
              <div>
                <span className="inline-flex items-center rounded-full border border-white/40 px-3 py-1 text-xs uppercase tracking-wide text-white/90">
                  Quản lý kho hàng
                </span>
                <h1 className="mt-6 text-4xl font-semibold leading-tight">
                  Quản lý kho hiện đại, trực quan và an toàn.
                </h1>
                <p className="mt-4 text-sm text-white/80">
                  Cập nhật tồn kho, đơn hàng và báo cáo trong một nền tảng thống nhất với khả năng bảo mật cao.
                </p>
              </div>

              <div className="space-y-4 text-sm">
                <div className="rounded-2xl border border-white/30 bg-white/10 p-4">
                  <p className="text-lg font-semibold">98%</p>
                  <p className="text-white/80">
                    Quản trị viên cảm thấy yên tâm với hệ thống đăng nhập được mã hóa.
                  </p>
                </div>
                <p className="text-white/70">
                  Nhập thông tin để truy cập vào trung tâm điều hành kho hàng của bạn.
                </p>
              </div>
            </div>

            <div className="bg-white p-8 text-slate-900 sm:p-12">
              <div className="mb-10">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
                  Chào mừng bạn trở lại
                </p>
                <h2 className="mt-2 text-3xl font-semibold text-slate-900">
                  Đăng nhập hệ thống
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Sử dụng tài khoản được cấp để tiếp tục quản trị kho hàng.
                </p>
              </div>

              {error && (
                <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
                  {error}
                </div>
              )}

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label htmlFor="username" className="text-sm font-medium text-slate-600">
                    Username
                  </label>
                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/50 shadow-inner focus-within:border-sky-400 focus-within:bg-white focus-within:shadow-sky-50">
                    <input
                      id="username"
                      name="username"
                      placeholder="Nhập username"
                      className="w-full rounded-2xl bg-transparent px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs uppercase tracking-wide text-slate-300">
                      ID
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-slate-600">
                    Password
                  </label>
                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/50 shadow-inner focus-within:border-sky-400 focus-within:bg-white focus-within:shadow-sky-50">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Nhập mật khẩu"
                      className="w-full rounded-2xl bg-transparent px-4 py-3 pr-20 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-2 my-1 rounded-xl px-3 text-xs font-medium text-slate-500 transition hover:bg-slate-100"
                      onClick={() => setShowPassword(prev => !prev)}
                    >
                      {showPassword ? 'Ẩn' : 'Hiện'}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-gradient-to-r from-sky-600 via-sky-500 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </button>
              </form>

              <p className="mt-8 text-center text-xs text-slate-400">
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
