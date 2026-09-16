"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Camera,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  ClipboardCheck,
  Check,
  ArrowRight,
  RotateCcw,
} from "lucide-react";

interface ToastState {
  show: boolean;
  message: string;
  type: "success" | "info" | "error";
}

export default function ScannerPage() {
  const [tokenInput, setTokenInput] = useState<string>("");
  const [sealInput, setSealInput] = useState<string>("");
  const [receiverName, setReceiverName] = useState<string>("");
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [verifiedAt, setVerifiedAt] = useState<string>("");

  // UI Toast notification state
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

  // Helper button: Auto-Paste Token Terakhir
  const handleAutoPaste = () => {
    setTokenInput("SIBANTU-REQ-CJN-002-K9X2P7M");
    setSealInput("SGL-4821");
    if (!receiverName) {
      setReceiverName("Siti Rahmawati (Koordinator Posko 02 Nagrak)");
    }
    triggerToast("Token dan Kode Segel terakhir berhasil di-paste secara instan!", "info");
  };

  // Submit Handler: Konfirmasi Bantuan Diterima
  const handleConfirmReceipt = (e: React.FormEvent) => {
    e.preventDefault();

    if (!tokenInput.trim()) {
      triggerToast("Mohon isi Token QR bantuan!", "error");
      return;
    }
    if (!sealInput.trim()) {
      triggerToast("Mohon masukkan 4-digit kode segel fisik!", "error");
      return;
    }
    if (!receiverName.trim()) {
      triggerToast("Mohon isi nama petugas penerima!", "error");
      return;
    }

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")} WIB`;

    setIsVerified(true);
    setVerifiedAt(timeStr);
    triggerToast("Konfirmasi Berhasil! Status bantuan resmi RECEIVED.", "success");
  };

  // Reset form for demo
  const handleReset = () => {
    setTokenInput("");
    setSealInput("");
    setReceiverName("");
    setIsVerified(false);
    setVerifiedAt("");
    triggerToast("Form verifikasi direset.", "info");
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
            Terminal Serah Terima
          </span>
          <span className="text-xs text-slate-500 font-medium flex items-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
            Validasi Lapangan
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">
          Verifikasi Penerimaan Bantuan di Posko
        </h1>
        <p className="text-sm text-slate-500">
          Protokol verifikasi fisik segel ganda untuk memastikan bantuan sampai secara sah ke posko tujuan.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kolom Kiri: Mockup Kamera Berbingkai Hijau */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Camera className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Pemindai QR Koli Bantuan</h3>
                  <p className="text-[11px] text-slate-500">
                    Area pemindaian kamera simulator di lokasi posko.
                  </p>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-mono font-semibold">
                GPS: ZONA POSKO AKTIF
              </span>
            </div>

            {/* Area Mockup Kamera Berbingkai Hijau (Aman Tanpa Error Izin Browser) */}
            <div className="mt-4 relative bg-slate-950 rounded-2xl overflow-hidden min-h-[290px] flex flex-col items-center justify-center border border-slate-800 shadow-inner">
              {/* Bingkai Hijau Pemindai */}
              <div className="w-52 h-52 border-2 border-emerald-400/90 rounded-2xl relative flex flex-col items-center justify-center bg-emerald-950/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                {/* Siku-siku Sudut Hijau Tebal */}
                <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-emerald-400 -mt-0.5 -ml-0.5 rounded-tl" />
                <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-emerald-400 -mt-0.5 -mr-0.5 rounded-tr" />
                <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-emerald-400 -mb-0.5 -ml-0.5 rounded-bl" />
                <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-emerald-400 -mb-0.5 -mr-0.5 rounded-br" />

                {/* Garis Animasi Laser Hijau */}
                <div className="w-full h-0.5 bg-emerald-400 shadow-[0_0_12px_#10b981] absolute top-1/2 -translate-y-1/2 animate-pulse" />

                {/* Teks Placeholder di Tengah */}
                <div className="text-center px-4 z-10 space-y-1">
                  <span className="text-xs font-bold text-emerald-300 font-mono block">
                    Kamera Viewport Placeholder
                  </span>
                  <span className="text-[10px] text-emerald-400/80 font-mono block">
                    Siap Mendeteksi QR Label
                  </span>
                </div>
              </div>

              <div className="mt-4 px-3 py-1 bg-slate-900/90 border border-slate-800 rounded-full text-[11px] text-emerald-300 font-mono flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Bidik QR Code pada Kardus Logistik</span>
              </div>
            </div>
          </div>

          {/* Tombol Helper Auto-Paste Token Terakhir */}
          <div className="pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleAutoPaste}
              className="w-full bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 text-xs font-semibold py-2.5 px-4 rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer shadow-sm"
            >
              <ClipboardCheck className="w-4 h-4 text-teal-600" />
              <span>Auto-Paste Token Terakhir (Simulasi Demo)</span>
            </button>
          </div>
        </div>

        {/* Kolom Kanan: Form 3 Kolom Verifikasi & Status RECEIVED */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Formulir Verifikasi Serah Terima</h3>
              <p className="text-[11px] text-slate-500">
                Lengkapi 3 input verifikasi di bawah untuk mengesahkan penerimaan bantuan.
              </p>
            </div>
            {isVerified && (
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-slate-400 hover:text-slate-600 flex items-center space-x-1 cursor-pointer"
                title="Reset Form"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>

          <form onSubmit={handleConfirmReceipt} className="space-y-4">
            {/* Kolom 1: Input Token QR */}
            <div>
              <label
                htmlFor="input-token-qr"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                1. Token QR Code
              </label>
              <input
                type="text"
                id="input-token-qr"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Contoh: SIBANTU-REQ-CJN-002-K9X2P7M"
                className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-800 outline-none focus:border-teal-500 focus:bg-white transition"
              />
            </div>

            {/* Kolom 2: Input 4-Digit Kode Segel Fisik */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="input-seal-code"
                  className="block text-xs font-bold uppercase tracking-wider text-amber-900"
                >
                  2. 4-Digit Kode Segel Fisik
                </label>
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                  Di Dalam Kardus
                </span>
              </div>
              <input
                type="text"
                id="input-seal-code"
                value={sealInput}
                onChange={(e) => setSealInput(e.target.value.toUpperCase())}
                placeholder="Contoh: SGL-4821"
                className="w-full text-xs font-mono uppercase bg-amber-50/40 border border-amber-300 rounded-xl p-3 text-amber-900 font-bold tracking-wider outline-none focus:border-amber-500 focus:bg-white transition"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Kode verifikasi fisik rahasia yang ditempel di bagian dalam kardus saat dibuka posko.
              </p>
            </div>

            {/* Kolom 3: Nama Penerima */}
            <div>
              <label
                htmlFor="input-receiver-name"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                3. Nama Petugas Penerima
              </label>
              <input
                type="text"
                id="input-receiver-name"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                placeholder="Contoh: Siti Rahmawati (Koordinator Posko)"
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-800 outline-none focus:border-teal-500 focus:bg-white transition"
              />
            </div>

            {/* Tombol Utama: Konfirmasi Bantuan Diterima */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl text-xs transition flex items-center justify-center space-x-2 shadow-md cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Konfirmasi Bantuan Diterima</span>
              </button>
            </div>
          </form>

          {/* Kartu Status Berhasil (RECEIVED) Langsung Muncul */}
          {isVerified && (
            <div className="p-4 bg-emerald-50 border-2 border-emerald-500/60 rounded-xl text-xs text-emerald-900 space-y-3 animate-in fade-in duration-300">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span className="font-bold text-sm text-emerald-800">
                    Status Berhasil: RECEIVED
                  </span>
                </div>
                <span className="text-[10px] font-mono bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-bold">
                  {verifiedAt || "14:25 WIB"}
                </span>
              </div>

              <div className="space-y-1.5 text-[11px] text-emerald-800">
                <div className="flex justify-between">
                  <span className="text-emerald-700">Token QR Terverifikasi:</span>
                  <span className="font-mono font-bold text-emerald-900">{tokenInput}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-700">Kode Segel Fisik:</span>
                  <span className="font-mono font-bold text-emerald-900">#{sealInput}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-700">Petugas Penerima:</span>
                  <span className="font-bold text-emerald-900">{receiverName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-700">Geolokasi Posko:</span>
                  <span className="font-medium text-emerald-900">Sah (-6.817, 107.142)</span>
                </div>
              </div>

              <div className="pt-2 border-t border-emerald-200 flex items-center justify-between">
                <span className="text-[11px] text-emerald-700 font-medium">
                  Tercatat tuntas di Portal Publik BPBD.
                </span>
                <Link
                  href="/"
                  className="inline-flex items-center space-x-1 text-[11px] font-bold text-teal-800 hover:text-teal-900 underline"
                >
                  <span>Lihat Portal Publik</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
