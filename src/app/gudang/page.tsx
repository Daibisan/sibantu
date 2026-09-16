"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Warehouse,
  PackageCheck,
  ClipboardX,
  CalendarClock,
  Tag,
  PackagePlus,
  ArrowRightCircle,
  Truck,
  Lock,
  Check,
  X,
  QrCode,
  CheckCircle2,
  Info,
} from "lucide-react";

interface ReadyRequest {
  id: string;
  posko: string;
  item: string;
  qty: number;
}

interface InventoryItem {
  id: string;
  name: string;
  available: number;
  unit: string;
  expiry: string;
  category: string;
}

interface ActiveDispatchLabel {
  posko: string;
  item: string;
  qty: number;
  qrToken: string;
  sealCode: string;
  status: string;
}

interface ToastState {
  show: boolean;
  message: string;
  type: "success" | "info";
}

const INITIAL_READY_REQUESTS: ReadyRequest[] = [
  {
    id: "REQ-CJN-002",
    posko: "Posko 02 - Nagrak (Kec. Cianjur) • Zona Kuning",
    item: "Paket Obat Darurat & P3K",
    qty: 35,
  },
  {
    id: "REQ-CJN-003",
    posko: "Posko 03 - Ciherang (Pacet) • Zona Hijau",
    item: "Makanan Bayi & Balita",
    qty: 50,
  },
  {
    id: "REQ-CJN-006",
    posko: "Posko 01 - Cugenang (Desa Gasol) • Zona Merah",
    item: "Beras Premium 10kg",
    qty: 40,
  },
];

const INITIAL_INVENTORIES: InventoryItem[] = [
  { id: "inv-1", name: "Paket Obat Darurat & P3K", available: 80, unit: "Box", expiry: "2026-09-28", category: "Kesehatan" },
  { id: "inv-2", name: "Makanan Bayi & Balita", available: 200, unit: "Kotak", expiry: "2026-10-05", category: "Nutrisi" },
  { id: "inv-3", name: "Beras Premium 10kg", available: 150, unit: "Sak", expiry: "2026-11-20", category: "Pangan Pokok" },
  { id: "inv-4", name: "Air Mineral Galon 19L", available: 300, unit: "Galon", expiry: "2027-01-15", category: "Air Bersih" },
  { id: "inv-5", name: "Selimut Tebal & Matras", available: 120, unit: "Pcs", expiry: "2029-12-31", category: "Sandang" },
];

export default function GudangPage() {
  const [readyRequests, setReadyRequests] = useState<ReadyRequest[]>(INITIAL_READY_REQUESTS);
  const [inventories, setInventories] = useState<InventoryItem[]>(INITIAL_INVENTORIES);

  // Active Label on the right card
  const [latestLabel, setLatestLabel] = useState<ActiveDispatchLabel>({
    posko: "Posko 01 - Cugenang (Desa Gasol) • Zona Merah",
    item: "Makanan Bayi & Balita",
    qty: 50,
    qrToken: "SIBANTU-REQ-CJN-001-K9X2P7M",
    sealCode: "SGL-4821",
    status: "SIAP DIPINDAI",
  });

  // Modal local state
  const [activeModalReq, setActiveModalReq] = useState<ReadyRequest | null>(null);

  // Toast notification state
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

  // Open modal
  const handleOpenDispatchModal = (req: ReadyRequest) => {
    setActiveModalReq(req);
  };

  // Close modal
  const handleCloseModal = () => {
    setActiveModalReq(null);
  };

  // Execute Dispatch confirmed
  const handleConfirmDispatch = () => {
    if (!activeModalReq) return;

    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newQrToken = `SIBANTU-${activeModalReq.id}-${randomStr}`;
    const newSealCode = `SGL-${Math.floor(1000 + Math.random() * 9000)}`;

    // Deduct stock
    setInventories((prev) =>
      prev.map((inv) =>
        inv.name === activeModalReq.item
          ? { ...inv, available: Math.max(0, inv.available - activeModalReq.qty) }
          : inv
      )
    );

    // Remove from verified ready list
    setReadyRequests((prev) => prev.filter((r) => r.id !== activeModalReq.id));

    // Update latest dispatch label
    setLatestLabel({
      posko: activeModalReq.posko,
      item: activeModalReq.item,
      qty: activeModalReq.qty,
      qrToken: newQrToken,
      sealCode: newSealCode,
      status: "SIAP DIPINDAI",
    });

    handleCloseModal();
    triggerToast(
      `Barang diberangkatkan! Label QR & Segel #${newSealCode} terbit.`,
      "success"
    );
  };

  // Sort FEFO by earliest expiry
  const sortedFefo = [...inventories].sort(
    (a, b) => new Date(a.expiry).getTime() - new Date(b.expiry).getTime()
  );

  return (
    <section id="view-gudang" className="gov-view-panel">
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
              <Info className="w-4 h-4 flex-shrink-0 text-teal-400" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 pb-4 border-b border-slate-200 gap-3">
        <div>
          <span className="px-2.5 py-0.5 text-xs font-semibold bg-purple-100 text-purple-800 rounded-full">
            Modul Manajemen Gudang &amp; FEFO
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Gudang Induk Logistik BPBD Cianjur
          </h1>
          <p className="text-sm text-slate-500">
            Mekanisme FEFO (First-Expired, First-Out) &amp; Pencetakan Label Segel Dua Lapis Terenkripsi.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-lg font-medium flex items-center">
            <Warehouse className="w-4 h-4 mr-1.5 text-purple-600" /> Gudang Balai Pamong Cianjur
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Verified Ready List & FEFO table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Verified Ready List Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-slate-800 text-base flex items-center">
                  <PackageCheck className="w-5 h-5 mr-2 text-teal-600" />
                  Permintaan Terverifikasi Siap Kirim
                </h2>
                <p className="text-xs text-slate-500">
                  Pilih permintaan yang telah disetujui BPBD untuk disiapkan alokasi stoknya dan dicetak labelnya.
                </p>
              </div>
            </div>

            {/* List */}
            <div className="space-y-3">
              {readyRequests.map((req) => {
                const itemInv = inventories.find((i) => i.name === req.item);
                const stockAvailable = itemInv ? itemInv.available : 0;

                return (
                  <div
                    key={req.id}
                    className="border border-slate-200 hover:border-teal-400 bg-slate-50/70 p-4 rounded-xl transition flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded">
                          {req.id}
                        </span>
                        <span className="text-xs font-semibold text-slate-800">{req.posko}</span>
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        Komoditas: <b className="text-slate-900">{req.item}</b> ({req.qty} unit) • Sisa Stok Gudang:{" "}
                        <span
                          className={`font-bold ${
                            stockAvailable < req.qty ? "text-rose-600" : "text-emerald-700"
                          }`}
                        >
                          {stockAvailable} unit
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenDispatchModal(req)}
                      className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-sm transition flex items-center justify-center space-x-1.5 flex-shrink-0 cursor-pointer"
                    >
                      <PackagePlus className="w-4 h-4" />
                      <span>Siapkan &amp; Kirim</span>
                    </button>
                  </div>
                );
              })}

              {readyRequests.length === 0 && (
                <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  <ClipboardX className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                  <p className="text-xs font-medium">Tidak ada permintaan yang menunggu dispatch.</p>
                  <p className="text-[11px] text-slate-500">
                    Setujui permintaan di Modul 3 (Command Center BPBD) terlebih dahulu.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* FEFO Priority Table Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-800 text-sm flex items-center">
                  <CalendarClock className="w-4 h-4 mr-2 text-amber-600" />
                  Prioritas Pengeluaran Stok (Algoritma FEFO)
                </h2>
                <p className="text-[11px] text-slate-500">
                  Barang dengan kedaluwarsa terdekat otomatis diprioritaskan keluar lebih awal untuk cegah limbah donasi.
                </p>
              </div>
              <span className="text-[11px] bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-semibold">
                Anti-Donation Waste
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 uppercase font-semibold">
                  <tr>
                    <th className="px-5 py-3">Nama Komoditas</th>
                    <th className="px-5 py-3">Kategori</th>
                    <th className="px-5 py-3">Sisa Stok</th>
                    <th className="px-5 py-3">Tanggal Kedaluwarsa</th>
                    <th className="px-5 py-3">Status Prioritas FEFO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedFefo.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50 transition ${idx === 0 ? "bg-amber-50/60 font-medium" : ""}`}
                    >
                      <td className="px-5 py-3 font-semibold text-slate-900">{item.name}</td>
                      <td className="px-5 py-3 text-slate-600">{item.category}</td>
                      <td className="px-5 py-3 font-bold text-slate-900">
                        {item.available} {item.unit}
                      </td>
                      <td className="px-5 py-3 font-mono text-slate-600">{item.expiry}</td>
                      <td className="px-5 py-3">
                        {idx === 0 ? (
                          <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full">
                            ⚡ PRIORITAS 1 (FEFO)
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">Prioritas {idx + 1}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Latest Dispatched Label Card */}
        <div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-800 flex items-center">
                <Tag className="w-4 h-4 mr-1.5 text-teal-600" /> Label Pengiriman Terakhir
              </h3>
              <span
                id="active-pkg-status"
                className="text-[10px] bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded font-mono font-bold"
              >
                {latestLabel.status}
              </span>
            </div>

            <div className="space-y-4 text-center">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs space-y-1.5">
                <div className="text-slate-500 text-[11px]">Tujuan Penyaluran:</div>
                <div className="font-bold text-slate-900 text-sm">{latestLabel.posko}</div>
                <div className="flex justify-between text-slate-600 pt-2 border-t border-slate-200">
                  <span>Komoditas:</span>
                  <span className="font-semibold text-slate-800">
                    {latestLabel.item} ({latestLabel.qty} unit)
                  </span>
                </div>
              </div>

              {/* QR Code Placeholder Box */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 inline-block shadow-sm">
                <div className="w-40 h-40 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center p-3">
                  <QrCode className="w-16 h-16 text-slate-800 mb-1" />
                  <span className="text-[9px] font-mono text-slate-500 text-center font-semibold">
                    QR KOLI KELUAR
                  </span>
                </div>
                <div className="text-[10px] text-slate-600 font-mono mt-2 break-all max-w-[180px]">
                  {latestLabel.qrToken}
                </div>
              </div>

              {/* Physical Seal Code Highlight */}
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-amber-900 text-xs text-left">
                <div className="text-[10px] uppercase font-bold tracking-wider text-amber-700">
                  Kode Segel Fisik (Di Dalam Kardus)
                </div>
                <div className="text-2xl font-black tracking-widest text-amber-800 my-1 font-mono">
                  #{latestLabel.sealCode}
                </div>
                <p className="text-[11px] text-amber-700 leading-tight">
                  Kode ini ditempel tersembunyi di dalam kardus, hanya dapat dibaca saat kardus dibuka oleh koordinator posko di lokasi tujuan.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href="/posko"
                  className="w-full bg-teal-700 hover:bg-teal-800 text-white font-semibold py-3 px-4 rounded-xl text-xs transition flex items-center justify-center space-x-1.5 shadow-sm"
                >
                  <ArrowRightCircle className="w-4 h-4" />
                  <span>Buka Terminal Verifikasi Serah Terima</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dispatch Modal Pop-up */}
      {activeModalReq && (
        <div
          id="dispatch-modal"
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Terbitkan Paket Pengiriman Logistik</h3>
                  <p className="text-[11px] text-slate-500">Otorisasi Gudang Logistik Bencana</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="text-slate-500 text-[11px]">Tujuan Posko Penerima:</div>
                <div className="font-bold text-slate-800 text-sm mt-0.5">{activeModalReq.posko}</div>
                <div className="flex justify-between text-slate-600 pt-2 border-t border-slate-200 mt-2">
                  <span>
                    Komoditas: <strong className="text-slate-800">{activeModalReq.item}</strong>
                  </span>
                  <span>
                    Jumlah: <strong className="text-slate-800">{activeModalReq.qty} unit</strong>
                  </span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-900 space-y-1">
                <div className="font-bold flex items-center">
                  <Lock className="w-3.5 h-3.5 mr-1.5 text-amber-700" /> Sistem Otomatis Menerbitkan Bukti Ganda:
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800">
                  <li>1 Token QR Sekali Pakai (ditempel pada sisi luar kemasan koli)</li>
                  <li>1 Kode Segel Fisik Rahasia 4-Digit (disematkan di bagian dalam kardus)</li>
                  <li>Pengurangan kuantitas stok gudang secara otomatis (FEFO)</li>
                </ul>
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={handleCloseModal}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
              >
                Batalkan
              </button>
              <button
                type="button"
                onClick={handleConfirmDispatch}
                className="flex-1 py-3 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-md transition flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Otorisasi &amp; Cetak Label</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
