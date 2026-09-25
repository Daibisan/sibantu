"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Login gagal");
        return;
      }

      const role = data.user.role.code;

      if (role === "ADMIN") {
        router.push("/dashboard/admin");
      } else if (role === "GUDANG") {
        router.push("/dashboard/gudang");
      } else if (role === "PETUGAS_POSKO") {
        router.push("/dashboard/posko");
      } else {
        setError("Role user tidak dikenali");
      }
    } catch {
      setError("Tidak dapat terhubung ke server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Left - Brand */}
          <section className="hidden bg-teal-700 p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                  <ShieldCheck className="h-6 w-6" />
                </div>

                <div>
                  <p className="text-xl font-bold tracking-tight">SIBANTU</p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-100">
                    Sistem Bantuan Bencana
                  </p>
                </div>
              </div>

              {/* Main copy */}
              <div className="mt-24 max-w-md">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-teal-50">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  Sistem Operasional Aktif
                </div>

                <h1 className="text-4xl font-bold leading-tight tracking-tight">
                  Bantuan tepat,
                  <br />
                  tercatat dengan jelas.
                </h1>

                <p className="mt-5 text-sm leading-6 text-teal-50/85">
                  SIBANTU membantu pengelolaan kebutuhan, stok, distribusi,
                  hingga serah terima bantuan secara terkoordinasi.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-white/15 pt-5">
              <p className="text-xs text-teal-100/70">
                Platform logistik penanggulangan bencana
              </p>
            </div>
          </section>

          {/* Right - Login */}
          <section className="p-6 sm:p-10 lg:p-12">
            {/* Mobile brand */}
            <div className="mb-10 flex items-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm">
                <ShieldCheck className="h-6 w-6" />
              </div>

              <div>
                <p className="text-xl font-bold tracking-tight text-slate-900">
                  SIBANTU
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Sistem Bantuan Bencana
                </p>
              </div>
            </div>

            {/* Heading */}
            <div className="mb-8">
              <p className="mb-2 text-sm font-semibold text-teal-600">
                Selamat datang kembali
              </p>

              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Masuk ke akun Anda
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Gunakan akun yang telah terdaftar untuk mengakses sistem.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Email
                </label>

                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="nama@sibantu.id"
                    autoComplete="email"
                    required
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Password
                  </label>
                </div>

                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Masukkan password"
                    autoComplete="current-password"
                    required
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    aria-label={
                      showPassword
                        ? "Sembunyikan password"
                        : "Tampilkan password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4.5 w-4.5" />
                    ) : (
                      <Eye className="h-4.5 w-4.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />

                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white shadow-sm shadow-teal-600/20 transition hover:bg-teal-700 focus:outline-none focus:ring-4 focus:ring-teal-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Memproses...
                  </>
                ) : (
                  <>
                    Masuk ke Sistem
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>

            {/* Demo account */}
            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Akun Demo
                </p>

                <span className="rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700">
                  DEVELOPMENT
                </span>
              </div>

              <div className="grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
                <div>
                  <p className="font-medium text-slate-700">Administrator</p>
                  <p>admin@sibantu.id</p>
                </div>

                <div>
                  <p className="font-medium text-slate-700">Gudang</p>
                  <p>gudang@sibantu.id</p>
                </div>

                <div>
                  <p className="font-medium text-slate-700">Posko</p>
                  <p>posko@sibantu.id</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <p className="mt-8 text-center text-xs text-slate-400">
              SIBANTU · Sistem Bantuan Logistik Bencana
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}