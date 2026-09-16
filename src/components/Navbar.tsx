"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PhoneCall,
  Database,
  RotateCcw,
  ShieldCheck,
  Globe,
  ClipboardList,
  LayoutDashboard,
  Boxes,
  QrCode,
  Binary,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

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
            <span className="hidden md:inline text-slate-600">|</span>
            <span className="hidden md:inline text-teal-400 font-mono">
              Sistem Terintegrasi SPBE &amp; Satu Data Bencana
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-slate-400 flex items-center">
              <PhoneCall className="w-3 h-3 mr-1 text-emerald-400" /> Hotline Tanggap Darurat:{" "}
              <strong className="text-white ml-1">117</strong>
            </span>
            <span className="text-slate-600">|</span>
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                title="Muat Data Uji Kasus Nyata Gempa Cianjur"
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded border border-slate-700 transition text-[10px] flex items-center space-x-1 cursor-pointer"
              >
                <Database className="w-3 h-3 text-teal-400" />
                <span>Simulasi Kasus Cianjur</span>
              </button>
              <button
                type="button"
                title="Reset ulang data sistem"
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-1 rounded border border-slate-700 transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
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

            {/* Official Status & Operator Badges */}
            <div className="hidden lg:flex items-center space-x-4">
              <div className="text-right border-r border-slate-200 pr-4">
                <div className="text-xs font-bold text-slate-800 flex items-center justify-end space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Pos Komando Induk Darurat</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Insiden: Gempa Bumi M5.6 Cianjur (Fase Tanggap 01)
                </div>
              </div>
              <div className="flex items-center space-x-2.5 bg-slate-50 p-2 rounded-xl border border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-xs shadow-inner">
                  BP
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-800 leading-tight">
                    Hendra, S.STP
                  </div>
                  <div className="text-[10px] text-slate-500">NIP. 19840211 200801 1 002</div>
                </div>
              </div>
            </div>
          </div>

          {/* Module Navigation Tabs */}
          <nav className="flex overflow-x-auto py-2 space-x-1.5 scrollbar-none border-t border-slate-100 text-xs font-semibold">
            <Link
              href="/"
              id="tab-publik"
              className={`gov-nav-tab flex items-center space-x-2 px-3.5 py-2 rounded-lg transition ${
                pathname === "/"
                  ? "gov-nav-active text-white"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Globe className="w-4 h-4 text-teal-600" />
              <span>1. Portal Transparansi Publik</span>
            </Link>
            <Link
              href="/posko"
              id="tab-posko"
              className={`gov-nav-tab flex items-center space-x-2 px-3.5 py-2 rounded-lg transition ${
                pathname === "/posko"
                  ? "gov-nav-active text-white"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <ClipboardList className="w-4 h-4 text-amber-500" />
              <span>2. Pengajuan Kebutuhan Posko</span>
            </Link>
            <button
              type="button"
              id="tab-bpbd"
              className="gov-nav-tab flex items-center space-x-2 px-3.5 py-2 rounded-lg transition text-slate-600 hover:text-slate-900 hover:bg-slate-50 cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4 text-blue-600" />
              <span>3. Command Center BPBD</span>
            </button>
            <button
              type="button"
              id="tab-gudang"
              className="gov-nav-tab flex items-center space-x-2 px-3.5 py-2 rounded-lg transition text-slate-600 hover:text-slate-900 hover:bg-slate-50 cursor-pointer"
            >
              <Boxes className="w-4 h-4 text-purple-600" />
              <span>4. Gudang &amp; Dispatch (FEFO)</span>
            </button>
            <button
              type="button"
              id="tab-scanner"
              className="gov-nav-tab flex items-center space-x-2 px-3.5 py-2 rounded-lg transition text-slate-600 hover:text-slate-900 hover:bg-slate-50 cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-emerald-600" />
              <span>5. Terminal Serah Terima</span>
            </button>
            <button
              type="button"
              id="tab-audit"
              className="gov-nav-tab flex items-center space-x-2 px-3.5 py-2 rounded-lg transition text-slate-600 hover:text-slate-900 hover:bg-slate-50 cursor-pointer"
            >
              <Binary className="w-4 h-4 text-rose-600" />
              <span>6. Buku Besar Audit (SHA-256)</span>
            </button>
          </nav>
        </div>
      </header>
    </>
  );
}
