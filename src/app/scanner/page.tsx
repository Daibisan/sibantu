"use client";

import React, { useState } from "react";
import {
  Camera,
  Wand2,
  CheckCheck,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";

interface ToastState {
  show: boolean;
  message: string;
  type: "success" | "info" | "error";
}

export default function ScannerPage() {
  const [tokenInput, setTokenInput] = useState<string>("");
  const [sealInput, setSealInput] = useState<string>("");
  const [receiverName, setReceiverName] = useState<string>(
    "Siti Rahmawati (Koordinator Posko 01 Gasol)"
  );
  const [isVerified, setIsVerified] = useState<boolean>(false);

  // Toast notification state
  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: "",
    type: "info",
  });

  const triggerToast = (message: string, type: "success" | "info" | "error" = "info") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3500);
  };

  // Simulation auto-paste handler
  const handleAutoPaste = () => {
    setTokenInput("SIBANTU-REQ-CJN-001-K9X2P7M");
    setSealInput("SGL-4821");
    triggerToast("Data token & segel paket aktif berhasil disalin ke formulir!", "info");
  };

  // Receipt confirmation handler
  const handleConfirmReceipt = (e: React.FormEvent) => {
    e.preventDefault();

    if (!tokenInput.trim()) {
      triggerToast("Token QR wajib diisi atau dipindai!", "error");
      return;
    }
    if (!sealInput.trim()) {
      triggerToast("Kode segel fisik (di dalam kardus) wajib dimasukkan!", "error");
      return;
    }

    setIsVerified(true);
    triggerToast("Serah terima sah terverifikasi secara fisik dan geolokasi!", "success");
  };

  return (
    <section id="view-scanner" className="gov-view-panel">
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col space-y-2 pointer-events-auto max-w-sm w-full px-4">
          <div
            className={`p-4 rounded-xl shadow-xl text-xs font-semibold flex items-center space-x-2.5 transition-all duration-300 ${
              toast.type === "success"
                ? "bg-slate-900 text-emerald-300 border border-emerald-500/50"
                : toast.type === "error"
                ? "bg-rose-900 text-white border border-rose-700"
                : "bg-slate-900 text-slate-100 border border-slate-700"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            ) : toast.type === "error" ? (
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            ) : (
              <Info className="w-4 h-4 flex-shrink-0 text-teal-400" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="mb-6 pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full">
            Modul Integritas Rantai Pasok (Custody Chain)
          </span>
          <span className="text-xs text-slate-500">Protokol Verifikasi Fisik Ganda Anti-Fiktif</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">
          Terminal Verifikasi Serah Terima Bantuan
        </h1>
        <p className="text-sm text-slate-500">
          Membuktikan paket telah tiba secara fisik di posko melalui pencocokan QR, Segel Kardus, dan Geolokasi.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Camera Scanner Card (Mockup) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Camera className="w-5 h-5 text-teal-600" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Pemindai Barcode / QR Koli</h3>
                <p className="text-[11px] text-slate-500">
                  Arahkan kamera ke QR yang tertera pada kemasan luar bantuan.
                </p>
              </div>
            </div>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-mono">
              GPS AKTIF (-6.817, 107.142)
            </span>
          </div>

          {/* Visual Camera Mockup Viewport */}
          <div className="relative bg-slate-900 rounded-xl overflow-hidden min-h-[260px] flex flex-col items-center justify-center border border-slate-800">
            <div className="w-48 h-48 border-2 border-emerald-400/80 rounded-xl relative flex flex-col items-center justify-center">
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400 -mt-0.5 -ml-0.5" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400 -mt-0.5 -mr-0.5" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400 -mb-0.5 -ml-0.5" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400 -mb-0.5 -mr-0.5" />

              {/* Scanning laser bounce */}
              <div className="w-full h-0.5 bg-emerald-400/70 shadow-[0_0_8px_#10b981] absolute top-1/2 -translate-y-1/2 animate-bounce" />

              {/* Placeholder text required */}
              <span className="text-xs font-semibold text-emerald-300 font-mono text-center px-3 z-10">
                Kamera Viewport Placeholder
              </span>
            </div>

            <span className="text-[11px] text-emerald-300 font-mono mt-3 bg-slate-950/80 px-3 py-1 rounded-full">
              Bidik QR Code Label Koli
            </span>
          </div>

          {/* Camera Controls */}
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => triggerToast("Kamera simulator aktif.", "info")}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-xs py-2.5 px-3 rounded-xl font-semibold transition flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer"
            >
              <Camera className="w-4 h-4 text-emerald-400" />
              <span>Buka Kamera Langsung</span>
            </button>
            <button
              type="button"
              onClick={handleAutoPaste}
              title="Ambil token paket yang baru saja di-dispatch"
              className="bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 text-xs py-2.5 px-3 rounded-xl font-semibold transition flex items-center space-x-1.5 cursor-pointer"
            >
              <Wand2 className="w-4 h-4 text-teal-600" />
              <span>Simulasi Auto-Paste</span>
            </button>
          </div>
        </div>

        {/* Right Column: Verification Form Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">Validasi Parameter Serah Terima Fisik</h3>
            <p className="text-[11px] text-slate-500">
              Masukkan kode token dan segel rahasia untuk mengunci status bantuan.
            </p>
          </div>

          <form onSubmit={handleConfirmReceipt} className="space-y-4">
            {/* Token Input */}
            <div>
              <label
                htmlFor="scan-token-input"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
              >
                1. Token QR Hasil Scan / Terbaca
              </label>
              <input
                type="text"
                id="scan-token-input"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Contoh: SIBANTU-REQ-CJN-001-X7K2P"
                className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-800 outline-none focus:border-teal-500 transition"
              />
            </div>

            {/* Seal Code Input */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label
                  htmlFor="scan-seal-input"
                  className="block text-xs font-bold uppercase tracking-wider text-amber-800"
                >
                  2. Kode Segel Fisik (Di Dalam Kardus)
                </label>
                <span className="text-[10px] text-slate-500 font-semibold">Wajib Disobek</span>
              </div>
              <input
                type="text"
                id="scan-seal-input"
                value={sealInput}
                onChange={(e) => setSealInput(e.target.value.toUpperCase())}
                placeholder="Contoh: SGL-4821"
                className="w-full text-xs font-mono uppercase bg-amber-50/40 border border-amber-300 rounded-xl p-3 text-amber-900 font-bold outline-none focus:border-amber-500 tracking-wider transition"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Petugas membuka kemasan dan mencocokkan kode fisik untuk mencegah barang ditukar di perjalanan.
              </p>
            </div>

            {/* Receiver Name */}
            <div>
              <label
                htmlFor="scan-receiver-name"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
              >
                3. Identitas Petugas Penerima di Lokasi
              </label>
              <input
                type="text"
                id="scan-receiver-name"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-800 outline-none focus:border-teal-500 transition"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl text-xs transition flex items-center justify-center space-x-2 shadow-md cursor-pointer"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Validasi &amp; Konfirmasi Bantuan Diterima (RECEIVED)</span>
              </button>
            </div>
          </form>

          {/* Verification Success Feedback */}
          {isVerified && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-xs text-emerald-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>
                Status <strong>RECEIVED</strong> aktif. Catatan kriptografis lolos uji geolokasi &amp; segel fisik.
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
