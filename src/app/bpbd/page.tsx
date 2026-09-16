"use client";

import React, { useState } from "react";
import {
  FileCheck2,
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 pb-4 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
              Pusat Komando &amp; Pengendalian Operasi (Pusdalops)
            </span>
            <span className="text-xs text-slate-500 font-medium flex items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
              Sistem Aktif Real-Time
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Pusat Otorisasi Bantuan BPBD Cianjur
          </h1>
          <p className="text-sm text-slate-500">
            Verifikasi otoritatif terhadap pengajuan bantuan sebelum pelepasan logistik dari gudang.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-lg font-medium text-slate-600 shadow-sm flex items-center">
            <FileCheck2 className="w-4 h-4 mr-1.5 text-teal-600" /> SK Tanggap Darurat: 360/Kep.114-BPBD/2026
          </span>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Pending */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-xs font-semibold uppercase">Menunggu Otorisasi</div>
          <div className="text-2xl font-black text-amber-600 mt-1" id="metric-pending-count">
            {pendingCount}
          </div>
          <div className="text-[11px] text-amber-700 mt-1 flex items-center font-medium">
            <Clock className="w-3 h-3 mr-1" /> Perlu verifikasi pejabat
          </div>
        </div>

        {/* Approved */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-xs font-semibold uppercase">Telah Diverifikasi</div>
          <div className="text-2xl font-black text-blue-600 mt-1" id="metric-approved-count">
            {approvedCount}
          </div>
          <div className="text-[11px] text-blue-700 mt-1 flex items-center font-medium">
            <CheckCircle className="w-3 h-3 mr-1" /> Diteruskan ke gudang
          </div>
        </div>

        {/* Dispatched */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-xs font-semibold uppercase">Dalam Perjalanan</div>
          <div className="text-2xl font-black text-purple-600 mt-1" id="metric-dispatched-count">
            {dispatchedCount}
          </div>
          <div className="text-[11px] text-purple-700 mt-1 flex items-center font-medium">
            <Truck className="w-3 h-3 mr-1" /> Membawa QR token aktif
          </div>
        </div>

        {/* Received */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-xs font-semibold uppercase">Selesai Diterima</div>
          <div className="text-2xl font-black text-emerald-600 mt-1" id="metric-received-count">
            {receivedCount}
          </div>
          <div className="text-[11px] text-emerald-700 mt-1 flex items-center font-medium">
            <ShieldCheck className="w-3 h-3 mr-1" /> Sah secara geoverifikasi
          </div>
        </div>
      </div>

      {/* BPBD Demand Processing Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="font-bold text-slate-800 text-base">
              Antrean Otorisasi Permintaan Logistik Bencana
            </h2>
            <p className="text-xs text-slate-500">
              Persetujuan pejabat BPBD diperlukan agar gudang dapat menyiapkan komoditas dan mencetak segel keamanan.
            </p>
          </div>
          <div className="text-xs text-slate-500">
            Standar Otorisasi: <strong>BPBD Kab. Cianjur</strong>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">ID / Waktu</th>
                <th className="px-5 py-3">Posko Pemohon</th>
                <th className="px-5 py-3">Komoditas &amp; Volume</th>
                <th className="px-5 py-3">Jiwa / Rasio</th>
                <th className="px-5 py-3">Urgensi</th>
                <th className="px-5 py-3">Status Permintaan</th>
                <th className="px-5 py-3 text-right">Tindakan Otorisasi</th>
              </tr>
            </thead>
            <tbody id="bpbd-request-table" className="divide-y divide-slate-100 text-xs">
              {requests.map((req) => {
                const ratio = (req.qty / req.beneficiaries).toFixed(2);
                return (
                  <tr key={req.id} className="hover:bg-slate-50 transition border-b border-slate-100">
                    {/* ID & Timestamp */}
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-700">
                      {req.id}
                      <div className="text-[10px] text-slate-400 font-normal">{req.createdAt}</div>
                    </td>

                    {/* Posko */}
                    <td className="px-5 py-3.5 font-medium text-slate-800">{req.posko}</td>

                    {/* Commodity & Volume */}
                    <td className="px-5 py-3.5">
                      <span className="font-bold text-slate-900">{req.item}</span>{" "}
                      <span className="text-slate-500 font-normal">({req.qty} unit)</span>
                    </td>

                    {/* Beneficiaries & Ratio */}
                    <td className="px-5 py-3.5">
                      <div>{req.beneficiaries} jiwa</div>
                      <div className="text-[10px] text-slate-500">{ratio} / jiwa</div>
                    </td>

                    {/* Urgency */}
                    <td className="px-5 py-3.5">
                      {req.urgency === "DARURAT" ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
                          DARURAT
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
                          NORMAL
                        </span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="px-5 py-3.5">
                      {req.status === "SUBMITTED" && (
                        <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold">
                          SUBMITTED
                        </span>
                      )}
                      {req.status === "VERIFIED" && (
                        <span className="text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-bold">
                          VERIFIED
                        </span>
                      )}
                      {req.status === "DISPATCHED" && (
                        <span className="text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded text-[10px] font-bold">
                          DISPATCHED
                        </span>
                      )}
                      {req.status === "RECEIVED" && (
                        <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">
                          RECEIVED
                        </span>
                      )}
                      {req.status === "REJECTED" && (
                        <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[10px] font-bold">
                          REJECTED
                        </span>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td className="px-5 py-3.5 text-right">
                      {req.status === "SUBMITTED" ? (
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleApprove(req.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition flex items-center shadow-sm cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5 mr-1" /> Setujui
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(req.id)}
                            className="bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-700 font-semibold px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer"
                          >
                            Tolak
                          </button>
                        </div>
                      ) : req.status === "VERIFIED" ? (
                        <span className="text-[11px] text-blue-600 font-medium">Disetujui (Gudang)</span>
                      ) : req.status === "REJECTED" ? (
                        <span className="text-[11px] text-rose-500 italic">Ditolak BPBD</span>
                      ) : req.status === "DISPATCHED" ? (
                        <span className="text-[11px] text-purple-600 font-medium">Dalam Pengiriman</span>
                      ) : (
                        <span className="text-[11px] text-emerald-600 font-medium">Selesai Diterima</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {requests.length === 0 && (
          <div id="bpbd-empty-state" className="p-12 text-center text-slate-400">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Inbox className="w-6 h-6" />
            </div>
            <p className="font-semibold text-slate-700 text-sm">Tidak Ada Antrean Permintaan</p>
            <p className="text-xs text-slate-500 mt-1">
              Gunakan Modul 2 (Pengajuan Kebutuhan Posko) untuk membuat pengajuan bantuan baru.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
