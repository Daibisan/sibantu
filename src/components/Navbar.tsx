"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PhoneCall,
  ShieldCheck,
  Globe,
  ClipboardList,
  LayoutDashboard,
  Boxes,
  QrCode,
  User,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Ambil data user yang sedang login
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSession(data.user);
        } else {
          setSession(null);
        }
        setIsLoading(false);
      })
      .catch(() => {
        setSession(null);
        setIsLoading(false);
      });
  }, [pathname]);

  // Sembunyikan Navbar di halaman login
  if (pathname === "/login") return null;

  // Logika pembatasan akses tab berdasarkan Role
  const rolesString = session?.roles?.map((r: any) => r.roleCode).join(' ').toUpperCase() || '';
  const isAdminOrBPBD = rolesString.includes('ADMIN') || rolesString.includes('BPBD');
  const isPosko = rolesString.includes('POSKO') || isAdminOrBPBD;
  const isGudang = rolesString.includes('GUDANG') || isAdminOrBPBD;

  return (
    <>
      {/* Top Banner / Official Government Notice */}
      <aside className="bg-slate-900 text-slate-300 text-[11px] border-b border-slate-800 py-1.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-1.5">
          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center space-x-1 font-semibold text-slate-200">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-600 mr-1 border border-white"></span>
              REPUBLIK INDONESIA
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300">
              Badan Penanggulangan Bencana Daerah (BPBD) Kab. Cianjur
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-slate-400 flex items-center">
              <PhoneCall className="w-3 h-3 mr-1 text-emerald-400" /> Hotline Tanggap Darurat:{" "}
              <strong className="text-white ml-1">117</strong>
            </span>
          </div>
        </div>
      </aside>

      {/* Main Header & Navigation */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Official Logo & Title */}
            <div className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-teal-700 via-teal-800 to-slate-900 flex items-center justify-center text-white shadow-md border border-teal-600/30">
                <ShieldCheck className="w-6 h-6 text-teal-300" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-black text-xl tracking-tight text-slate-900">SIBANTU</span>
                  <span className="text-[10px] bg-teal-50 text-teal-800 px-2 py-0.5 rounded border border-teal-200 font-bold uppercase tracking-wider">
                    E-Gov Logistik
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Sistem Integrasi Bantuan Terpantau &amp; Akuntabel
                </p>
              </div>
            </div>

            {/* Operator Badges & Dynamic Profile */}
            <div className="flex items-center gap-2 sm:gap-4">
              {isLoading ? (
                <div className="text-xs text-slate-400 animate-pulse">Memuat...</div>
              ) : session ? (
                <>
                  <div className="hidden sm:block text-right border-r border-slate-200 pr-3 sm:pr-4">
                    <div className="text-xs font-bold text-slate-800 flex items-center justify-end space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Pos Komando Induk Darurat</span>
                    </div>
                    <div className="text-[11px] text-slate-500">Kabupaten Cianjur</div>
                  </div>

                  {/* Profil User (Klik menuju Dashboard) */}
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 sm:gap-2.5 bg-slate-50 p-1.5 sm:p-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-xs shadow-inner">
                      {session.name ? session.name.substring(0, 2).toUpperCase() : <User className="w-4 h-4" />}
                    </div>
                    <div className="text-left hidden min-[400px]:block">
                      <div className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">
                        {session.name}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[120px]">
                        {session.roles?.[0]?.roleName || 'Petugas'}
                      </div>
                    </div>
                  </Link>
                </>
              ) : (
                <Link
                  href="/login"
                  className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-4 py-2 sm:py-2.5 rounded-xl transition shadow-sm flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  <span>Login Petugas</span>
                </Link>
              )}
            </div>
          </div>

          {/* Module Navigation Tabs (Dynamic) */}
          <nav className="flex overflow-x-auto py-2 space-x-1.5 scrollbar-none border-t border-slate-100 text-xs font-semibold">
            {/* Tab Navigasi Khusus Petugas (Muncul Jika Login) */}
            {session && (
              <>
                <Link
                  href="/"
                  className={`gov-nav-tab flex items-center space-x-2 px-3.5 py-2 rounded-lg transition ${pathname === "/"
                      ? "gov-nav-active text-white"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                >
                  <Globe className="w-4 h-4 text-teal-600" />
                  <span>Portal Publik</span>
                </Link>

                <Link
                  href="/dashboard"
                  className={`gov-nav-tab flex items-center space-x-2 px-3.5 py-2 rounded-lg transition ${pathname === "/dashboard"
                      ? "gov-nav-active text-white"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-slate-600" />
                  <span>Dashboard</span>
                </Link>

                {isPosko && (
                  <Link
                    href="/posko"
                    className={`gov-nav-tab flex items-center space-x-2 px-3.5 py-2 rounded-lg transition ${pathname === "/posko"
                        ? "gov-nav-active text-white"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                  >
                    <ClipboardList className="w-4 h-4 text-amber-500" />
                    <span>Form Posko</span>
                  </Link>
                )}

                {isAdminOrBPBD && (
                  <Link
                    href="/bpbd"
                    className={`gov-nav-tab flex items-center space-x-2 px-3.5 py-2 rounded-lg transition ${pathname === "/bpbd"
                        ? "gov-nav-active text-white"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                  >
                    <LayoutDashboard className="w-4 h-4 text-blue-600" />
                    <span>Command BPBD</span>
                  </Link>
                )}

                {isGudang && (
                  <Link
                    href="/gudang"
                    className={`gov-nav-tab flex items-center space-x-2 px-3.5 py-2 rounded-lg transition ${pathname === "/gudang"
                        ? "gov-nav-active text-white"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                  >
                    <Boxes className="w-4 h-4 text-purple-600" />
                    <span>Gudang Induk</span>
                  </Link>
                )}

                {(isPosko || isGudang || isAdminOrBPBD) && (
                  <Link
                    href="/scanner"
                    className={`gov-nav-tab flex items-center space-x-2 px-3.5 py-2 rounded-lg transition ${pathname === "/scanner"
                        ? "gov-nav-active text-white"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                  >
                    <QrCode className="w-4 h-4 text-emerald-600" />
                    <span>Terminal Serah Terima</span>
                  </Link>
                )}
              </>
            )}
          </nav>
        </div>
      </header>
    </>
  );
}