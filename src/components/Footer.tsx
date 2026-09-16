import React from "react";
import { ShieldCheck } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 text-xs py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pb-6 border-b border-slate-800">
          <div className="md:col-span-2 space-y-2">
            <div className="flex items-center space-x-2 text-white font-bold text-sm">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>SIBANTU • BPBD KABUPATEN CIANJUR</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-lg">
              Sistem Integrasi Bantuan Terpantau &amp; Akuntabel dikembangkan sebagai
              instrumen tata kelola rantai pasok tanggap darurat bencana untuk menjamin
              bantuan sampai ke penerima yang sah dan bebas dari pelaporan fiktif.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-2">Landasan Regulasi</h4>
            <ul className="space-y-1 text-slate-400 text-[11px]">
              <li>• UU No. 24 Tahun 2007 (Bencana)</li>
              <li>• Perpres No. 95 Tahun 2018 (SPBE)</li>
              <li>• UU No. 27 Tahun 2022 (Pelindungan Data)</li>
              <li>• Juknis BNPB No. 7 Tahun 2023</li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-2">Pusdalops Bencana</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Gedung Pusat Penanggulangan Bencana Daerah Kab. Cianjur
              <br />
              Jl. Raya Babakan No. 12, Cianjur, Jawa Barat
              <br />
              Call Center: <strong>117</strong> / (0263) 291-000
            </p>
          </div>
        </div>
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400">
          <div>
            &copy; 2026 Pemerintah Kabupaten Cianjur • BPBD. Hak Cipta Dilindungi Undang-Undang.
          </div>
          <div className="mt-2 sm:mt-0 font-mono text-slate-400">
            SIBANTU v2.4 (Simulasi Tanggap Darurat)
          </div>
        </div>
      </div>
    </footer>
  );
}
