import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { User, Mail, Shield, AlertTriangle, Layers, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { LogoutButton } from '@/components/LogoutButton';

export default async function DashboardPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/login');
  }

  // Pengecekan Role RBAC
  const rolesString = session.roles.map((r) => r.roleCode).join(' ').toUpperCase();
  const isAdminOrBPBD = rolesString.includes('ADMIN') || rolesString.includes('BPBD');
  const isPosko = rolesString.includes('POSKO') || isAdminOrBPBD;
  const isGudang = rolesString.includes('GUDANG') || isAdminOrBPBD;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-50 to-white border border-teal-200 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-200 mb-4">
            <Shield className="w-3.5 h-3.5" />
            Sistem Logistik Bencana Aktif
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Selamat Datang, {session.name}
          </h1>
        </div>
        <div className="shrink-0">
          <LogoutButton />
        </div>
      </div>

      {/* User & Role Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: User Profile */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-teal-600" />
            Profil Pengguna
          </h2>
          <div className="space-y-3">
            <div>
              <span className="text-xs text-slate-500 block">ID Pengguna</span>
              <span className="text-sm font-mono text-slate-800">#{session.userId}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Nama Lengkap</span>
              <span className="text-sm font-medium text-slate-900">{session.name}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Email Terdaftar</span>
              <span className="text-sm text-slate-700 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {session.email}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Status Akun</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 mt-1">
                ACTIVE
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Active Roles from Database */}
        <div className="lg:col-span-2 bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-teal-600" />
            Otorisasi Role Aktif
          </h2>
          {session.roles.length === 0 ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Pengguna ini belum memiliki role grant aktif yang tercatat di database.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {session.roles.map((role, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold tracking-wide bg-teal-100 text-teal-800 border border-teal-200 font-mono">
                        {role.roleCode}
                      </span>
                      <span className="text-sm font-semibold text-slate-800">
                        {role.roleName}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      Lingkup Bencana: {role.disasterEventId ? `Event ID #${role.disasterEventId}` : 'Nasional / Global'}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200 self-start sm:self-center">
                    Grant Status: ACTIVE
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}