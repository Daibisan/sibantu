"use client";

import React, { useState } from "react";
import { Send, Info, AlertTriangle, CheckCircle2 } from "lucide-react";

interface ToastState {
  show: boolean;
  message: string;
  type: "success" | "info" | "error";
}

export default function PoskoPage() {
  // Form input states (only essential fields)
  const [posko, setPosko] = useState<string>("Posko 01 - Cugenang (Desa Gasol)");
  const [item, setItem] = useState<string>("Makanan Bayi & Balita");
  const [qty, setQty] = useState<number | string>(40);
  const [beneficiaries, setBeneficiaries] = useState<number | string>(120);
  const [urgency, setUrgency] = useState<"NORMAL" | "DARURAT">("NORMAL");

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

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const reqId = `REQ-CJN-${Math.floor(100 + Math.random() * 900)}`;
    triggerToast(
      `Pengajuan ${reqId} (${item} - ${qty} unit) berhasil dikirim ke Command Center BPBD!`,
      "success"
    );
  };

  // Quick Auto-Fill for Demo
  const handleAutoFill = () => {
    setItem("Paket Obat Darurat & P3K");
    setQty(35);
    setBeneficiaries(80);
    setUrgency("DARURAT");
    triggerToast("Data kasus darurat berhasil dimuat untuk simulasi demo.", "info");
  };

  return (
    <section id="view-posko" className="gov-view-panel">
      {/* Toast Notification Container */}
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
          <span className="px-2.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 rounded-full">
            Modul Operasional Lapangan
          </span>
          <span className="text-xs text-slate-500">Formulir Logistik Lapangan</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">
          Formulir Permintaan Kebutuhan Logistik Pengungsi
        </h1>
        <p className="text-sm text-slate-500">
          Diajukan langsung oleh Koordinator Posko Lapangan untuk diverifikasi oleh BPBD.
        </p>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Input 1: Dropdown Posko */}
            <div>
              <label
                htmlFor="req-posko-select"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Titik Posko Pengungsian
              </label>
              <select
                id="req-posko-select"
                value={posko}
                onChange={(e) => setPosko(e.target.value)}
                className="w-full text-sm bg-white border border-slate-300 rounded-xl p-3 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
              >
                <option value="Posko 01 - Cugenang (Desa Gasol)">
                  Posko 01 - Cugenang (Desa Gasol) • Zona Merah
                </option>
                <option value="Posko 02 - Nagrak (Kec. Cianjur)">
                  Posko 02 - Nagrak (Kec. Cianjur) • Zona Kuning
                </option>
                <option value="Posko 03 - Ciherang (Pacet)">
                  Posko 03 - Ciherang (Pacet) • Zona Hijau
                </option>
              </select>
            </div>

            {/* Input 2: Dropdown Komoditas Barang */}
            <div>
              <label
                htmlFor="req-item-name"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Komoditas Barang
              </label>
              <select
                id="req-item-name"
                value={item}
                onChange={(e) => setItem(e.target.value)}
                className="w-full text-sm bg-white border border-slate-300 rounded-xl p-3 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
              >
                <option value="Makanan Bayi & Balita">Makanan Bayi &amp; Balita (Kotak Nutrisi Siap Santap)</option>
                <option value="Paket Obat Darurat & P3K">Paket Obat Darurat &amp; P3K (Box Medis Lapangan)</option>
                <option value="Selimut Tebal & Matras">Selimut Tebal &amp; Matras (Pcs Perlengkapan Hangat)</option>
                <option value="Beras Premium 10kg">Beras Premium 10kg (Sak Bahan Pokok)</option>
                <option value="Air Mineral Galon 19L">Air Mineral Galon 19L (Galon Higienis)</option>
              </select>
            </div>

            {/* Input 3 & 4: Jumlah Unit & Jumlah Jiwa Pengungsi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="req-qty"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Jumlah Unit
                </label>
                <input
                  type="number"
                  id="req-qty"
                  required
                  min={1}
                  max={500}
                  value={qty}
                  onChange={(e) => setQty(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full text-sm bg-white border border-slate-300 rounded-xl p-3 text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none transition font-medium"
                />
              </div>
              <div>
                <label
                  htmlFor="req-beneficiaries"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Jumlah Jiwa Pengungsi
                </label>
                <input
                  type="number"
                  id="req-beneficiaries"
                  required
                  min={1}
                  max={2000}
                  value={beneficiaries}
                  onChange={(e) => setBeneficiaries(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full text-sm bg-white border border-slate-300 rounded-xl p-3 text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none transition font-medium"
                />
              </div>
            </div>

            {/* Input 5: Pilihan Urgensi (Normal / Darurat) */}
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Pilihan Urgensi
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`border rounded-xl p-3.5 flex items-start space-x-3 cursor-pointer transition ${
                    urgency === "NORMAL"
                      ? "border-teal-500 bg-teal-50/20 ring-1 ring-teal-500"
                      : "border-slate-300 bg-white hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="urgency"
                    value="NORMAL"
                    checked={urgency === "NORMAL"}
                    onChange={() => setUrgency("NORMAL")}
                    className="mt-1 text-teal-600 focus:ring-teal-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Normal</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Stok di posko masih mencukupi untuk &gt;24 jam ke depan.
                    </div>
                  </div>
                </label>

                <label
                  className={`border rounded-xl p-3.5 flex items-start space-x-3 cursor-pointer transition ${
                    urgency === "DARURAT"
                      ? "border-rose-400 bg-rose-50/60 ring-1 ring-rose-400"
                      : "border-rose-300 bg-rose-50/40 hover:bg-rose-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="urgency"
                    value="DARURAT"
                    checked={urgency === "DARURAT"}
                    onChange={() => setUrgency("DARURAT")}
                    className="mt-1 text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-rose-700">Darurat</div>
                    <div className="text-[11px] text-rose-600/80 mt-0.5">
                      Stok kritis &lt;6 jam atau kebutuhan mendesak.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Tombol Kirim Pengajuan Bersih */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full bg-teal-700 hover:bg-teal-800 text-white font-semibold py-3.5 px-6 rounded-xl shadow-md text-xs transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Kirim Pengajuan</span>
              </button>
            </div>

            {/* Tombol Kecil Isi Cepat Data Kasus di Bawah Form */}
            <div className="pt-2 text-center border-t border-slate-100">
              <button
                type="button"
                onClick={handleAutoFill}
                className="text-xs text-slate-500 hover:text-teal-700 transition inline-flex items-center space-x-1.5 cursor-pointer py-1.5 px-3 rounded-lg hover:bg-slate-50 border border-slate-200"
              >
                <span>⚡</span>
                <span>Isi Cepat Data Kasus</span>
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar Information Card */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 text-sm flex items-center">
              <Info className="w-4 h-4 mr-2 text-teal-600" /> Prosedur Pengajuan Bantuan
            </h3>
            <ul className="text-xs text-slate-600 space-y-3 mt-3">
              <li className="flex items-start">
                <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center mr-2 text-[10px] flex-shrink-0">
                  1
                </span>
                <span>
                  Permintaan posko berstatus <strong>SUBMITTED</strong> masuk ke Command Center BPBD.
                </span>
              </li>
              <li className="flex items-start">
                <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center mr-2 text-[10px] flex-shrink-0">
                  2
                </span>
                <span>
                  Petugas BPBD memverifikasi kebutuhan posko dan meneruskannya ke gudang logistik.
                </span>
              </li>
              <li className="flex items-start">
                <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center mr-2 text-[10px] flex-shrink-0">
                  3
                </span>
                <span>
                  Gudang menerbitkan token QR dan paket logistik siap diberangkatkan ke posko.
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-xs text-amber-900">
            <div className="font-bold flex items-center">
              <AlertTriangle className="w-4 h-4 mr-1.5 text-amber-700" /> Catatan Posko Lapangan:
            </div>
            <p className="mt-1 text-[11px] text-amber-800 leading-relaxed">
              Pastikan jumlah jiwa pengungsi terdata akurat sesuai kondisi riil lapangan untuk kelancaran penyaluran bantuan.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
