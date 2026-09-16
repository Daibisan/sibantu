"use client";

import React, { useState } from "react";
import {
  Clock,
  CheckCircle,
  Truck,
  ShieldCheck,
  Check,
  Inbox,
  CheckCircle2,
  Info,
} from "lucide-react";

type UrgencyLevel = "NORMAL" | "DARURAT";
type RequestStatus = "SUBMITTED" | "VERIFIED" | "DISPATCHED" | "RECEIVED" | "REJECTED";

interface PoskoRequest {
  id: string;
  posko: string;
  item: string;
  qty: number;
  beneficiaries: number;
  urgency: UrgencyLevel;
  status: RequestStatus;
  createdAt: string;
}

const INITIAL_REQUESTS: PoskoRequest[] = [
  {
    id: "REQ-CJN-001",
    posko: "Posko 01 - Cugenang (Desa Gasol) • Zona Merah",
    item: "Makanan Bayi & Balita (Nutrisi Siap Santap)",
    qty: 50,
    beneficiaries: 140,
    urgency: "DARURAT",
    status: "SUBMITTED",
    createdAt: "14:10 WIB",
  },
  {
    id: "REQ-CJN-002",
    posko: "Posko 02 - Nagrak (Kec. Cianjur) • Zona Kuning",
    item: "Paket Obat Darurat & P3K (Box Medis)",
    qty: 35,
    beneficiaries: 90,
    urgency: "DARURAT",
    status: "SUBMITTED",
    createdAt: "13:45 WIB",
  },
  {
    id: "REQ-CJN-003",
    posko: "Posko 03 - Ciherang (Pacet) • Zona Hijau",
    item: "Selimut Tebal & Matras (Pcs)",
    qty: 40,
    beneficiaries: 110,
    urgency: "NORMAL",
    status: "VERIFIED",
    createdAt: "12:30 WIB",
  },
  {
    id: "REQ-CJN-004",
    posko: "Posko 01 - Cugenang (Desa Gasol) • Zona Merah",
    item: "Beras Premium 10kg (Sak)",
    qty: 60,
    beneficiaries: 180,
    urgency: "NORMAL",
    status: "DISPATCHED",
    createdAt: "11:15 WIB",
  },
  {
    id: "REQ-CJN-005",
    posko: "Posko 02 - Nagrak (Kec. Cianjur) • Zona Kuning",
    item: "Air Mineral Galon 19L (Galon Higienis)",
    qty: 50,
    beneficiaries: 120,
    urgency: "NORMAL",
    status: "RECEIVED",
    createdAt: "09:20 WIB",
  },
];

interface ToastState {
  show: boolean;
  message: string;
  type: "success" | "info";
}

export default function BPBDPage() {
  const [requests, setRequests] = useState<PoskoRequest[]>(INITIAL_REQUESTS);
  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: "",
    type: "info",
  });

  const triggerToast = (message: string, type: "success" | "info" = "info") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3500);
  };

  // Dynamic Metric Counts
  const pendingCount = requests.filter((r) => r.status === "SUBMITTED").length;
  const approvedCount = requests.filter((r) => r.status === "VERIFIED").length;
  const dispatchedCount = requests.filter((r) => r.status === "DISPATCHED").length;
  const receivedCount = requests.filter((r) => r.status === "RECEIVED").length;

  // Approve Handler
  const handleApprove = (id: string) => {
    setRequests((prev) =>
      prev.map((req) => (req.id === id ? { ...req, status: "VERIFIED" } : req))
    );
    triggerToast(`Permintaan ${id} disetujui! Diteruskan ke Gudang Logistik.`, "success");
  };

  // Reject Handler
  const handleReject = (id: string) => {
    setRequests((prev) =>
      prev.map((req) => (req.id === id ? { ...req, status: "REJECTED" } : req))
    );
    triggerToast(`Permintaan ${id} ditolak oleh BPBD.`, "info");
  };

  return (
    <section id="view-bpbd" className="gov-view-panel">
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col space-y-2 pointer-events-auto max-w-sm w-full px-4">
          <div
            className={`p-4 rounded-xl shadow-xl text-xs font-semibold flex items-center space-x-2.5 transition-all duration-300 ${
              toast.type === "success"
                ? "bg-slate-900 text-emerald-300 border border-emerald-500/50"
                : "bg-slate-900 text-slate-100 border border-slate-700"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            ) : (
              <Info className="w-4 h-4 flex-shrink-0 text-amber-400" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="mb-6 pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
            Command Center BPBD
          </span>
          <span className="text-xs text-slate-500 font-medium flex items-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
            Sistem Pemantauan Aktif
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">
          Pusat Otorisasi Bantuan BPBD
        </h1>
        <p className="text-sm text-slate-500">
          Otorisasi cepat permohonan logistik posko sebelum pelepasan barang dari gudang.
        </p>
      </div>

      {/* 4 Metric Cards (Menunggu, Disetujui, Dalam Perjalanan, Selesai) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Menunggu */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-xs font-semibold uppercase">Menunggu</div>
          <div className="text-2xl font-black text-amber-600 mt-1" id="metric-pending-count">
            {pendingCount}
          </div>
          <div className="text-[11px] text-amber-700 mt-1 flex items-center font-medium">
            <Clock className="w-3 h-3 mr-1" /> Perlu otorisasi
          </div>
        </div>

        {/* Disetujui */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-xs font-semibold uppercase">Disetujui</div>
          <div className="text-2xl font-black text-emerald-600 mt-1" id="metric-approved-count">
            {approvedCount}
          </div>
          <div className="text-[11px] text-emerald-700 mt-1 flex items-center font-medium">
            <CheckCircle className="w-3 h-3 mr-1" /> Siap disiapkan gudang
          </div>
        </div>

        {/* Dalam Perjalanan */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-xs font-semibold uppercase">Dalam Perjalanan</div>
          <div className="text-2xl font-black text-blue-600 mt-1" id="metric-dispatched-count">
            {dispatchedCount}
          </div>
          <div className="text-[11px] text-blue-700 mt-1 flex items-center font-medium">
            <Truck className="w-3 h-3 mr-1" /> Menuju posko tujuan
          </div>
        </div>

        {/* Selesai */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-xs font-semibold uppercase">Selesai</div>
          <div className="text-2xl font-black text-purple-600 mt-1" id="metric-received-count">
            {receivedCount}
          </div>
          <div className="text-[11px] text-purple-700 mt-1 flex items-center font-medium">
            <ShieldCheck className="w-3 h-3 mr-1" /> Tuntas diserahterimakan
          </div>
        </div>
      </div>

      {/* BPBD Demand Processing Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="font-bold text-slate-800 text-base">
              Daftar Permintaan Logistik Bencana
            </h2>
            <p className="text-xs text-slate-500">
              Pilih tindakan persetujuan untuk meneruskan instruksi dispatch ke tim gudang.
            </p>
          </div>
          <div className="text-xs text-slate-500">
            Total Pengajuan: <strong className="text-slate-800">{requests.length}</strong>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">ID</th>
                <th className="px-5 py-3">Posko</th>
                <th className="px-5 py-3">Barang &amp; Jumlah</th>
                <th className="px-5 py-3">Tingkat Urgensi</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody id="bpbd-request-table" className="divide-y divide-slate-100 text-xs">
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50 transition border-b border-slate-100">
                  {/* Kolom 1: ID */}
                  <td className="px-5 py-3.5 font-mono font-bold text-slate-700 whitespace-nowrap">
                    {req.id}
                    <div className="text-[10px] text-slate-400 font-normal">{req.createdAt}</div>
                  </td>

                  {/* Kolom 2: Posko */}
                  <td className="px-5 py-3.5 font-medium text-slate-800">
                    {req.posko}
                  </td>

                  {/* Kolom 3: Barang & Jumlah */}
                  <td className="px-5 py-3.5">
                    <span className="font-bold text-slate-900">{req.item}</span>
                    <span className="text-slate-500 font-medium ml-1">
                      ({req.qty} unit)
                    </span>
                  </td>

                  {/* Kolom 4: Tingkat Urgensi */}
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    {req.urgency === "DARURAT" ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 border border-rose-200 inline-flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1 animate-pulse"></span>
                        DARURAT
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 inline-flex items-center">
                        NORMAL
                      </span>
                    )}
                  </td>

                  {/* Kolom 5: Tombol Aksi */}
                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                    {req.status === "SUBMITTED" ? (
                      <div className="flex items-center justify-end space-x-2">
                        {/* Tombol Hijau Approve */}
                        <button
                          type="button"
                          onClick={() => handleApprove(req.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition flex items-center shadow-sm cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" /> Approve
                        </button>
                        {/* Tombol Abu-abu Tolak */}
                        <button
                          type="button"
                          onClick={() => handleReject(req.id)}
                          className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer"
                        >
                          Tolak
                        </button>
                      </div>
                    ) : req.status === "VERIFIED" ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Check className="w-3 h-3 mr-1 text-emerald-600" /> Disetujui
                      </span>
                    ) : req.status === "REJECTED" ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        Ditolak
                      </span>
                    ) : req.status === "DISPATCHED" ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        <Truck className="w-3 h-3 mr-1 text-blue-600" /> Dalam Perjalanan
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        <ShieldCheck className="w-3 h-3 mr-1 text-purple-600" /> Selesai
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {requests.length === 0 && (
          <div id="bpbd-empty-state" className="p-12 text-center text-slate-400">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Inbox className="w-6 h-6" />
            </div>
            <p className="font-semibold text-slate-700 text-sm">Tidak Ada Permintaan</p>
            <p className="text-xs text-slate-500 mt-1">
              Gunakan Modul Pengajuan Posko untuk mengirim permohonan baru.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
