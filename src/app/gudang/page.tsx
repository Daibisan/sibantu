"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  PackageCheck,
  CalendarClock,
  Truck,
  QrCode,
  ArrowRight,
  X,
  ClipboardX,
  CheckCircle2,
} from "lucide-react";

interface ApprovedRequest {
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
}

interface DispatchedPackage {
  id: string;
  posko: string;
  item: string;
  qty: number;
  qrToken: string;
  sealCode: string;
}

const INITIAL_REQUESTS: ApprovedRequest[] = [
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
  { id: "inv-1", name: "Paket Obat Darurat & P3K", available: 80, unit: "Box", expiry: "2026-09-28" },
  { id: "inv-2", name: "Makanan Bayi & Balita", available: 200, unit: "Kotak", expiry: "2026-10-05" },
  { id: "inv-3", name: "Beras Premium 10kg", available: 150, unit: "Sak", expiry: "2026-11-20" },
  { id: "inv-4", name: "Air Mineral Galon 19L", available: 300, unit: "Galon", expiry: "2027-01-15" },
  { id: "inv-5", name: "Selimut Tebal & Matras", available: 120, unit: "Pcs", expiry: "2029-12-31" },
];

export default function GudangPage() {
  const [approvedRequests, setApprovedRequests] = useState<ApprovedRequest[]>(INITIAL_REQUESTS);
  const [inventories, setInventories] = useState<InventoryItem[]>(INITIAL_INVENTORIES);

  // Pop-up modal state for dispatched package
  const [dispatchedModal, setDispatchedModal] = useState<DispatchedPackage | null>(null);

  // Sort inventories by earliest expiry date (FEFO rule)
  const sortedFefo = [...inventories].sort(
    (a, b) => new Date(a.expiry).getTime() - new Date(b.expiry).getTime()
  );

  // Handle Kirim / Dispatch
  const handleDispatch = (req: ApprovedRequest) => {
    // Generate deterministic/consistent 4-digit seal code (e.g., SGL-4821)
    const sealNumber = req.id === "REQ-CJN-002" ? "4821" : Math.floor(1000 + Math.random() * 9000).toString();
    const token = `SIBANTU-${req.id}-K9X2P7M`;

    // Deduct warehouse inventory
    setInventories((prev) =>
      prev.map((inv) =>
        inv.name === req.item
          ? { ...inv, available: Math.max(0, inv.available - req.qty) }
          : inv
      )
    );

    // Remove from approved queue
    setApprovedRequests((prev) => prev.filter((item) => item.id !== req.id));

    // Open pop-up with generated QR Code and 4-digit seal code
    setDispatchedModal({
      id: req.id,
      posko: req.posko,
      item: req.item,
      qty: req.qty,
      qrToken: token,
      sealCode: `SGL-${sealNumber}`,
    });
  };

  const handleCloseModal = () => {
    setDispatchedModal(null);
  };

  return (
    <section id="view-gudang" className="gov-view-panel">
      {/* Header Section */}
      <div className="mb-6 pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-0.5 text-xs font-semibold bg-purple-100 text-purple-800 rounded-full">
            Manajemen Gudang Logistik
          </span>
          <span className="text-xs text-slate-500 font-medium flex items-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
            Gudang Induk Cianjur
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">
          Pengelolaan Stok &amp; Pengiriman Bantuan
        </h1>
        <p className="text-sm text-slate-500">
          Prioritas pengeluaran stok berbasis FEFO dan penerbitan paket pengiriman yang disetujui BPBD.
        </p>
      </div>

      {/* Two Main Components: Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Komponen 1: Daftar Permintaan yang Sudah Disetujui BPBD */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-slate-800 text-base flex items-center">
                  <PackageCheck className="w-5 h-5 mr-2 text-teal-600" />
                  Permintaan Disetujui BPBD
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Siap diberangkatkan ke posko pengungsian tujuan.
                </p>
              </div>
              <span className="text-xs bg-teal-50 text-teal-700 border border-teal-200 font-bold px-2.5 py-1 rounded-full">
                {approvedRequests.length} Siap Kirim
              </span>
            </div>

            {/* List Permintaan */}
            <div className="space-y-3.5 mt-4">
              {approvedRequests.map((req) => {
                const stockItem = inventories.find((i) => i.name === req.item);
                const currentStock = stockItem ? stockItem.available : 0;

                return (
                  <div
                    key={req.id}
                    className="border border-slate-200 hover:border-teal-400 bg-slate-50/60 p-4 rounded-xl transition flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded">
                          {req.id}
                        </span>
                        <span className="text-xs font-semibold text-slate-800">
                          {req.posko}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 mt-1.5">
                        Barang: <b className="text-slate-900">{req.item}</b> ({req.qty} unit)
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Sisa stok di rak: <span className="font-semibold text-slate-700">{currentStock} unit</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDispatch(req)}
                      className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition flex items-center justify-center space-x-1.5 flex-shrink-0 cursor-pointer"
                    >
                      <Truck className="w-4 h-4" />
                      <span>Kirim / Dispatch</span>
                    </button>
                  </div>
                );
              })}

              {approvedRequests.length === 0 && (
                <div className="p-10 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  <ClipboardX className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                  <p className="text-xs font-medium">Semua permintaan yang disetujui telah dikirim.</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Permintaan baru akan muncul setelah disetujui di modul BPBD.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-500">
            Klik tombol <strong>Kirim / Dispatch</strong> untuk menerbitkan QR Code dan kode segel pengiriman.
          </div>
        </div>

        {/* Komponen 2: Tabel Stok Gudang Sederhana & Penanda FEFO */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-800 text-base flex items-center">
                  <CalendarClock className="w-4 h-4 mr-2 text-amber-600" />
                  Stok Gudang (Prioritas FEFO)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Barang dengan kedaluwarsa terdekat diprioritaskan keluar lebih awal.
                </p>
              </div>
              <span className="text-[11px] bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-semibold">
                FEFO Rule
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Nama Barang</th>
                    <th className="px-5 py-3">Jumlah Sisa</th>
                    <th className="px-5 py-3">Kedaluwarsa</th>
                    <th className="px-5 py-3">Prioritas FEFO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedFefo.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50 transition ${
                        idx === 0 ? "bg-amber-50/50 font-medium" : ""
                      }`}
                    >
                      <td className="px-5 py-3.5 font-bold text-slate-900">{item.name}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-800">
                        {item.available} {item.unit}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-600">{item.expiry}</td>
                      <td className="px-5 py-3.5">
                        {idx === 0 ? (
                          <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full inline-flex items-center">
                            ⚡ Prioritas 1 (Segera Keluar)
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-medium">
                            Prioritas {idx + 1}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-4 bg-slate-50/60 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Metode Pengeluaran: <strong>First-Expired, First-Out</strong></span>
            <span>Total Komoditas: <strong>{inventories.length} Jenis</strong></span>
          </div>
        </div>
      </div>

      {/* Pop-up Modal Saat Tombol Kirim / Dispatch Diklik */}
      {dispatchedModal && (
        <div
          id="dispatch-popup-modal"
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative">
            {/* Tombol Tutup */}
            <button
              type="button"
              onClick={handleCloseModal}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Pop-up */}
            <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Paket Pengiriman Diterbitkan</h3>
                <p className="text-xs text-slate-500">ID Pengajuan: <strong className="text-slate-700 font-mono">{dispatchedModal.id}</strong></p>
              </div>
            </div>

            {/* Detail Barang & Posko */}
            <div className="my-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="text-slate-500 text-[11px]">Posko Tujuan:</div>
              <div className="font-bold text-slate-800">{dispatchedModal.posko}</div>
              <div className="text-slate-600 pt-1 border-t border-slate-200 flex justify-between">
                <span>Barang:</span>
                <span className="font-semibold text-slate-900">
                  {dispatchedModal.item} ({dispatchedModal.qty} unit)
                </span>
              </div>
            </div>

            {/* 1. Tampilan QR Code */}
            <div className="text-center my-3">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 inline-block shadow-sm">
                <div className="w-36 h-36 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center p-2 mx-auto">
                  <QrCode className="w-16 h-16 text-slate-800 mb-1" />
                  <span className="text-[9px] font-mono text-slate-500 font-semibold">
                    QR KOLI KELUAR
                  </span>
                </div>
                <div className="text-[10px] text-slate-600 font-mono mt-2 break-all max-w-[190px]">
                  {dispatchedModal.qrToken}
                </div>
              </div>
            </div>

            {/* 2. 4-Digit Kode Segel (misal: #SGL-4821) */}
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-center my-4">
              <div className="text-[10px] uppercase font-bold tracking-wider text-amber-800">
                4-Digit Kode Segel Fisik
              </div>
              <div className="text-3xl font-black font-mono tracking-widest text-amber-900 my-1">
                #{dispatchedModal.sealCode}
              </div>
              <p className="text-[11px] text-amber-700">
                Kode segel ini ditempel di dalam kardus untuk diverifikasi di posko saat serah terima.
              </p>
            </div>

            {/* 3. Tombol "Lanjut ke Serah Terima" */}
            <div className="space-y-2 pt-2">
              <Link
                href="/scanner"
                className="w-full bg-teal-700 hover:bg-teal-800 text-white font-semibold py-3 px-4 rounded-xl text-xs transition flex items-center justify-center space-x-2 shadow-sm"
              >
                <span>Lanjut ke Serah Terima</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                type="button"
                onClick={handleCloseModal}
                className="w-full text-xs text-slate-500 hover:text-slate-700 py-1.5 transition cursor-pointer"
              >
                Tetap di Halaman Gudang
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
