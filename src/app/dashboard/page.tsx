import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { LogoutButton } from '@/components/LogoutButton';
import { ShieldCheck, User, Mail, Shield, AlertTriangle, Layers, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600/20 text-teal-400 ring-1 ring-teal-500/30 flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="font-bold text-lg text-white">SIBANTU</span>
              <span className="ml-2 text-xs bg-teal-500/10 text-teal-400 px-2 py-0.5 rounded-full border border-teal-500/20 font-medium">
                Sesi Terautentikasi
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-semibold text-slate-200">{session.name}</span>
              <span className="text-xs text-slate-400">{session.email}</span>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-950/60 via-slate-900 to-slate-900 border border-teal-900/40 p-6 sm:p-8">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/30 mb-4">
              <Shield className="w-3.5 h-3.5" />
              Sistem Logistik Bencana Aktif
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Selamat Datang, {session.name}
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              Anda berhasil login ke sistem SIBANTU. Kredensial dan hak akses Anda diverifikasi secara langsung dari tabel <code className="text-teal-400 bg-slate-950 px-1.5 py-0.5 rounded">users</code> dan <code className="text-teal-400 bg-slate-950 px-1.5 py-0.5 rounded">role_grants</code> di database PostgreSQL Railway.
            </p>
          </div>
        </div>

        {/* User & Role Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1: User Profile */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-teal-400" />
              Profil Pengguna
            </h2>
            <div className="space-y-3">
              <div>
                <span className="text-xs text-slate-500 block">ID Pengguna</span>
                <span className="text-sm font-mono text-slate-200">#{session.userId}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Nama Lengkap</span>
                <span className="text-sm font-medium text-white">{session.name}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Email Terdaftar</span>
                <span className="text-sm text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  {session.email}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Status Akun</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mt-1">
                  ACTIVE
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Active Roles from Database */}
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-teal-400" />
              Otorisasi Role Aktif (dari Database)
            </h2>

            {session.roles.length === 0 ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Pengguna ini belum memiliki role grant aktif yang tercatat di database.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {session.roles.map((role, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold tracking-wide bg-teal-500/20 text-teal-300 border border-teal-500/30 font-mono">
                          {role.roleCode}
                        </span>
                        <span className="text-sm font-semibold text-slate-200">
                          {role.roleName}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-slate-500" />
                        Lingkup Bencana: {role.disasterEventId ? `Event ID #${role.disasterEventId}` : 'Nasional / Global'}
                      </p>
                    </div>

                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 self-start sm:self-center">
                      Grant Status: ACTIVE
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Navigation into MVP Modules (Prepared for next phases) */}
        <div className="border border-slate-800/80 bg-slate-900/40 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-white mb-2">Modul Operasional MVP</h2>
          <p className="text-xs text-slate-400 mb-4">
            Modul-modul ini akan dihubungkan sesuai flow pengajuan bantuan, dispatch gudang, dan serah terima logistik.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/posko"
              className="p-4 rounded-xl bg-slate-950/50 hover:bg-slate-900 border border-slate-800 hover:border-teal-500/40 transition-all group flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-semibold text-teal-400 block mb-1">Halaman 1</span>
                <span className="text-sm font-medium text-slate-200 group-hover:text-white">Form Posko Lapangan</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition-transform group-hover:translate-x-1" />
            </Link>

            <Link
              href="/bpbd"
              className="p-4 rounded-xl bg-slate-950/50 hover:bg-slate-900 border border-slate-800 hover:border-teal-500/40 transition-all group flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-semibold text-teal-400 block mb-1">Halaman 2</span>
                <span className="text-sm font-medium text-slate-200 group-hover:text-white">Command Center BPBD</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition-transform group-hover:translate-x-1" />
            </Link>

            <Link
              href="/gudang"
              className="p-4 rounded-xl bg-slate-950/50 hover:bg-slate-900 border border-slate-800 hover:border-teal-500/40 transition-all group flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-semibold text-teal-400 block mb-1">Halaman 3</span>
                <span className="text-sm font-medium text-slate-200 group-hover:text-white">Gudang & Dispatch</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
