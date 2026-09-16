'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, LogIn, Loader2, CheckCircle2, User, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Login gagal. Periksa kembali email dan kata sandi Anda.');
        setLoading(false);
        return;
      }

      // Login success -> redirect to dashboard
      router.push('/dashboard');
      router.refresh();
    } catch {
      setErrorMessage('Terjadi kendala jaringan saat menghubungi server.');
      setLoading(false);
    }
  }

  // Quick fill helper for hackathon testers
  function handleFillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword('password123');
    setErrorMessage(null);
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-600/20 text-teal-400 ring-1 ring-teal-500/30 mb-4">
            <ShieldAlert className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">SIBANTU</h1>
          <p className="text-sm text-slate-400 mt-1">
            Sistem Manajemen Distribusi Bantuan & Logistik Bencana
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800/80 backdrop-blur border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-xl">
          <h2 className="text-lg font-semibold text-slate-200 mb-6 flex items-center gap-2">
            <LogIn className="w-5 h-5 text-teal-400" />
            Masuk ke Portal Petugas
          </h2>

          {/* Error Box */}
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-2">
                Alamat Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@sibantu.id"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-sm"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-2">
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-sm"
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-medium text-sm transition-colors shadow-lg shadow-teal-900/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi kredensial...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Masuk</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill Buttons */}
          <div className="mt-8 pt-6 border-t border-slate-700/60">
            <p className="text-xs font-medium text-slate-400 mb-3 text-center">
              Akun Uji Coba Cepat (Password: <code className="text-teal-300">password123</code>)
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleFillDemo('admin@sibantu.id')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white text-xs text-center border border-slate-600/50 transition-colors"
              >
                BPBD (Admin)
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('gudang@sibantu.id')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white text-xs text-center border border-slate-600/50 transition-colors"
              >
                Gudang
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('posko@sibantu.id')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white text-xs text-center border border-slate-600/50 transition-colors"
              >
                Posko
              </button>
            </div>
          </div>
        </div>

        {/* Security Badge Note */}
        <p className="text-center text-xs text-slate-500 mt-6 flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
          Kredensial diverifikasi langsung via PostgreSQL Railway
        </p>
      </div>
    </div>
  );
}
