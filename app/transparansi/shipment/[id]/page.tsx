"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { use } from "react";
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MapPin,
  Calendar,
  ShieldCheck,
  LogIn,
  Circle,
  Siren,
  ArrowRight,
} from "lucide-react";

type ShipmentDetail = {
  id: number;
  shipment_code: string;
  request_id: number;
  request_code: string;
  status: string;
  created_at: string;
  dispatched_at: string | null;
  delivered_at: string | null;
  request_reason: string;
  requested_at: string;
  approved_at: string | null;
  event: { id: number; code: string; name: string };
  destination: { id: number; name: string; address: string | null };
};

type ShipmentItem = {
  id: number;
  item_code: string;
  item_name: string;
  unit: string;
  quantity: number;
  status: string;
};

type ShipmentLeg = {
  id: number;
  sequence_no: number;
  from_location_name: string;
  to_location_name: string;
  status: string;
  dispatched_at: string | null;
  arrived_at: string | null;
};


function fmtDate(iso: string | null) {
  if (!iso) return "–";
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    PREPARING: {
      label: "Dipersiapkan",
      className: "bg-amber-50 text-amber-700 border-amber-200",
    },
    DISPATCHED: {
      label: "Dikirim",
      className: "bg-violet-50 text-violet-700 border-violet-200",
    },
    IN_TRANSIT: {
      label: "Dalam Perjalanan",
      className: "bg-violet-50 text-violet-700 border-violet-200",
    },
    DELIVERED: {
      label: "Terkirim",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    ARRIVED: {
      label: "Tiba",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    PENDING: {
      label: "Menunggu",
      className: "bg-amber-50 text-amber-700 border-amber-200",
    },
  };

  const c = map[status] ?? {
    label: status,
    className: "bg-slate-100 text-slate-600 border-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${c.className}`}
    >
      {c.label}
    </span>
  );
}

function LegStatusDot({ status }: { status: string }) {
  if (status === "ARRIVED" || status === "DELIVERED") {
    return (
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <CheckCircle2 className="h-4 w-4" />
      </div>
    );
  }
  if (status === "IN_TRANSIT" || status === "DISPATCHED") {
    return (
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600 animate-pulse">
        <Truck className="h-3.5 w-3.5" />
      </div>
    );
  }
  return (
    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
      <Circle className="h-3 w-3" />
    </div>
  );
}


export default function ShipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [shipment, setShipment] = useState<ShipmentDetail | null>(null);
  const [items, setItems] = useState<ShipmentItem[]>([]);
  const [legs, setLegs] = useState<ShipmentLeg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/public/shipments/${id}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Data pengiriman tidak ditemukan");
        }
        throw new Error("Gagal mengambil data pengiriman");
      }

      const json = await res.json();

      if (!json.success) {
        throw new Error(json.message || "Gagal memuat data");
      }

      setShipment(json.shipment);
      setItems(json.items ?? []);
      setLegs(json.legs ?? []);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Terjadi kesalahan saat memuat data pengiriman"
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/transparansi" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm shadow-teal-600/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-slate-900">
                  SIBANTU
                </span>
                <span className="rounded-md border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700">
                  PORTAL PUBLIK
                </span>
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Detail Pelacakan Logistik
              </p>
            </div>
          </Link>

          <Link
            href="/login"
            className="group inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-teal-600/20 transition hover:bg-teal-700 focus:outline-none focus:ring-4 focus:ring-teal-500/20"
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>Masuk Petugas</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href="/transparansi"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-teal-600"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Daftar Transparansi</span>
          </Link>
        </div>

        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white"
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-12 text-center shadow-sm">
            <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />
            <p className="mt-3 font-semibold text-red-800">{error}</p>
            <Link
              href="/transparansi"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Daftar
            </Link>
          </div>
        )}

        {!loading && !error && shipment && (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Kode Pengiriman
                  </span>
                  <h1 className="mt-1 font-mono text-2xl font-bold tracking-tight text-teal-700 sm:text-3xl">
                    {shipment.shipment_code}
                  </h1>
                  <p className="mt-1 text-xs text-slate-500">
                    Referensi Permintaan:{" "}
                    <span className="font-mono font-semibold text-blue-700">
                      {shipment.request_code}
                    </span>
                  </p>
                </div>

                <StatusBadge status={shipment.status} />
              </div>

              {/* Metadata Grid */}
              <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-6 sm:grid-cols-4">
                <div>
                  <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <Siren className="h-3 w-3 text-slate-400" />
                    Event Bencana
                  </span>
                  <p className="mt-1 text-xs font-semibold text-slate-900">
                    {shipment.event.name}
                  </p>
                  <p className="font-mono text-[11px] text-slate-400">
                    {shipment.event.code}
                  </p>
                </div>

                <div>
                  <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <MapPin className="h-3 w-3 text-slate-400" />
                    Lokasi Posko
                  </span>
                  <p className="mt-1 text-xs font-semibold text-slate-900">
                    {shipment.destination.name}
                  </p>
                  {shipment.destination.address && (
                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      {shipment.destination.address}
                    </p>
                  )}
                </div>

                <div>
                  <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <Calendar className="h-3 w-3 text-slate-400" />
                    Dibuat Pada
                  </span>
                  <p className="mt-1 text-xs font-semibold text-slate-700">
                    {fmtDate(shipment.created_at)}
                  </p>
                </div>

                <div>
                  <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <Clock className="h-3 w-3 text-slate-400" />
                    {shipment.delivered_at ? "Waktu Tiba" : "Waktu Dikirim"}
                  </span>
                  <p className="mt-1 text-xs font-semibold text-slate-700">
                    {fmtDate(shipment.delivered_at ?? shipment.dispatched_at)}
                  </p>
                </div>
              </div>

              {/* Request Reason */}
              {shipment.request_reason && (
                <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Alasan / Keterangan Permintaan
                  </span>
                  <p className="mt-1 text-xs leading-relaxed text-slate-700">
                    {shipment.request_reason}
                  </p>
                </div>
              )}
            </div>

            {/* Items Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                    <Package className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Daftar Item Bantuan
                    </h2>
                    <p className="text-xs text-slate-400">
                      Rincian jenis dan kuantitas barang logistik dalam pengiriman ini
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                  {items.length} item
                </span>
              </div>

              {items.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Belum ada item tercatat untuk pengiriman ini.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Kode Item</th>
                        <th className="px-4 py-3">Nama Barang</th>
                        <th className="px-4 py-3 text-right">Jumlah</th>
                        <th className="px-4 py-3 text-right">Status Item</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-mono font-semibold text-slate-500">
                            {item.item_code}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {item.item_name}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">
                            {item.quantity.toLocaleString("id-ID")}{" "}
                            <span className="font-normal text-slate-400">
                              {item.unit}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <StatusBadge status={item.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Tracking Journey Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                  <Truck className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Pelacakan Rute & Perjalanan
                  </h2>
                  <p className="text-xs text-slate-400">
                    Tahapan perjalanan bantuan dari gudang asal hingga ke lokasi posko
                  </p>
                </div>
              </div>

              {legs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Belum ada catatan tahapan perjalanan untuk pengiriman ini.
                </div>
              ) : (
                <div className="relative pl-2">
                  {legs.map((leg, idx) => {
                    const isLast = idx === legs.length - 1;
                    return (
                      <div key={leg.id} className="relative flex gap-4 pb-6">
                        {/* Connecting line */}
                        {!isLast && (
                          <div className="absolute left-[11px] top-6 h-full w-0.5 bg-slate-200" />
                        )}

                        <LegStatusDot status={leg.status} />

                        <div className="flex-1 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Tahap {leg.sequence_no}
                              </span>
                              <p className="mt-0.5 text-sm font-semibold text-slate-900">
                                {leg.from_location_name}
                                <span className="mx-2 text-slate-400">→</span>
                                {leg.to_location_name}
                              </p>
                            </div>
                            <StatusBadge status={leg.status} />
                          </div>

                          <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                            {leg.dispatched_at && (
                              <span className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                <span>Berangkat: {fmtDate(leg.dispatched_at)}</span>
                              </span>
                            )}
                            {leg.arrived_at && (
                              <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Tiba: {fmtDate(leg.arrived_at)}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <footer className="mt-12 border-t border-slate-200 pt-8 text-center text-xs text-slate-400">
          <p className="font-medium text-slate-600">
            SIBANTU · Sistem Bantuan Logistik Penanggulangan Bencana
          </p>
          <p className="mt-1">
            Data pelacakan ini merupakan rekaman resmi distribusi bantuan bencana
            yang diverifikasi oleh petugas posko dan gudang.
          </p>
        </footer>
      </main>
    </div>
  );
}
