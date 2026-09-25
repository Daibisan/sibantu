"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  RotateCw,
  Search,
  Package,
  FileText,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  ChevronRight,
  Globe,
  LogIn,
  MapPin,
  Calendar,
  Siren,
  ArrowRight,
} from "lucide-react";


type DisasterEvent = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  status: string;
  started_at: string | null;
  ended_at: string | null;
};

type AidRequest = {
  id: number;
  request_code: string;
  event_code: string;
  event_name: string;
  requester_location_name: string;
  status: string;
  reason: string;
  requested_at: string;
  approved_at: string | null;
  shipment_code: string | null;
  shipment_status: string | null;
};

type Shipment = {
  id: number;
  shipment_code: string;
  status: string;
  created_at: string;
  dispatched_at: string | null;
  delivered_at: string | null;
  request_code: string;
  event_code: string;
  event_name: string;
  destination_name: string;
  destination_address: string | null;
};

type TransparencyData = {
  events: DisasterEvent[];
  requests: AidRequest[];
  shipments: Shipment[];
};


function StatusBadge({ status }: { status: string }) {
  const map: Record<
    string,
    { label: string; className: string; icon: React.ReactNode }
  > = {
    ACTIVE: {
      label: "Aktif",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    CLOSED: {
      label: "Selesai",
      className: "bg-slate-100 text-slate-600 border-slate-200",
      icon: <XCircle className="h-3 w-3" />,
    },
    COMPLETED: {
      label: "Selesai",
      className: "bg-slate-100 text-slate-600 border-slate-200",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    PENDING: {
      label: "Menunggu",
      className: "bg-amber-50 text-amber-700 border-amber-200",
      icon: <Clock className="h-3 w-3" />,
    },
    APPROVED: {
      label: "Disetujui",
      className: "bg-blue-50 text-blue-700 border-blue-200",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    REJECTED: {
      label: "Ditolak",
      className: "bg-red-50 text-red-700 border-red-200",
      icon: <AlertTriangle className="h-3 w-3" />,
    },
    IN_TRANSIT: {
      label: "Dalam Perjalanan",
      className: "bg-violet-50 text-violet-700 border-violet-200",
      icon: <Truck className="h-3 w-3" />,
    },
    DELIVERED: {
      label: "Terkirim",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    ARRIVED: {
      label: "Tiba",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    PREPARING: {
      label: "Dipersiapkan",
      className: "bg-sky-50 text-sky-700 border-sky-200",
      icon: <Package className="h-3 w-3" />,
    },
    DISPATCHED: {
      label: "Dikirim",
      className: "bg-violet-50 text-violet-700 border-violet-200",
      icon: <Truck className="h-3 w-3" />,
    },
  };

  const badge = map[status] ?? {
    label: status,
    className: "bg-slate-100 text-slate-600 border-slate-200",
    icon: <Clock className="h-3 w-3" />,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}
    >
      {badge.icon}
      {badge.label}
    </span>
  );
}

function fmtDate(iso: string | null) {
  if (!iso) return "–";
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Tab = "shipments" | "requests" | "events";


export default function TransparansiPage() {
  const [data, setData] = useState<TransparencyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("shipments");
  const [search, setSearch] = useState("");

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const res = await fetch("/api/public/transparency", { cache: "no-store" });

      if (!res.ok) throw new Error("Gagal mengambil data dari server");

      const json = (await res.json()) as TransparencyData & { success: boolean };

      if (!json.success) throw new Error("Respons API tidak valid");

      setData(json);
    } catch {
      setError("Gagal memuat data transparansi. Periksa koneksi Anda dan coba lagi.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Filter logic
  const q = search.trim().toLowerCase();

  const filteredEvents =
    data?.events.filter(
      (e) =>
        !q ||
        e.code.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q) ||
        (e.description ?? "").toLowerCase().includes(q)
    ) ?? [];

  const filteredRequests =
    data?.requests.filter(
      (r) =>
        !q ||
        r.request_code.toLowerCase().includes(q) ||
        r.event_name.toLowerCase().includes(q) ||
        r.requester_location_name.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q)
    ) ?? [];

  const filteredShipments =
    data?.shipments.filter(
      (s) =>
        !q ||
        s.shipment_code.toLowerCase().includes(q) ||
        s.request_code.toLowerCase().includes(q) ||
        s.event_name.toLowerCase().includes(q) ||
        s.destination_name.toLowerCase().includes(q)
    ) ?? [];

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count: number }[] =
    [
      {
        id: "shipments",
        label: "Pengiriman Bantuan",
        icon: <Truck className="h-4 w-4" />,
        count: filteredShipments.length,
      },
      {
        id: "requests",
        label: "Permintaan Bantuan",
        icon: <FileText className="h-4 w-4" />,
        count: filteredRequests.length,
      },
      {
        id: "events",
        label: "Event Bencana",
        icon: <Globe className="h-4 w-4" />,
        count: filteredEvents.length,
      },
    ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
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
                Transparansi Logistik Bencana
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

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3.5 py-1 text-xs font-semibold text-teal-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              Pemantauan Terbuka & Real-time
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Transparansi Distribusi Bantuan Logistik
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
              Masyarakat dan relawan dapat memantau alur penyaluran logistik bencana
              secara langsung. Seluruh riwayat pengiriman, kebutuhan posko, dan data
              bencana tercatat dan dapat diakses publik tanpa perlu login.
            </p>
          </div>
        </section>

        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Pengiriman Bantuan
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <Truck className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-bold tracking-tight text-slate-900">
                {loading ? "..." : (data?.shipments.length ?? 0)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                <span className="font-semibold text-violet-600">
                  {data?.shipments.filter((s) => s.status === "DELIVERED").length ?? 0}
                </span>{" "}
                berhasil terkirim ke posko
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Permintaan Bantuan
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <FileText className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-bold tracking-tight text-slate-900">
                {loading ? "..." : (data?.requests.length ?? 0)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                <span className="font-semibold text-blue-600">
                  {data?.requests.filter((r) => r.status === "APPROVED").length ?? 0}
                </span>{" "}
                permintaan telah disetujui
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Event Bencana
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                <Siren className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-bold tracking-tight text-slate-900">
                {loading ? "..." : (data?.events.length ?? 0)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                <span className="font-semibold text-emerald-600">
                  {data?.events.filter((e) => e.status === "ACTIVE").length ?? 0}
                </span>{" "}
                event penanganan aktif
              </p>
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="transparency-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari kode pengiriman, permintaan, lokasi tujuan, atau event..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
              />
            </div>

            {/* Segmented Tabs */}
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 p-1.5">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`tab-${tab.id}`}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${isActive
                        ? "bg-white text-teal-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isActive
                          ? "bg-teal-50 text-teal-700"
                          : "bg-slate-200 text-slate-600"
                        }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Header Bar inside table container */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {activeTab === "shipments" && "Daftar Pengiriman Bantuan"}
                {activeTab === "requests" && "Daftar Permintaan Bantuan"}
                {activeTab === "events" && "Daftar Event Bencana"}
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                {activeTab === "shipments" &&
                  `Menampilkan ${filteredShipments.length} dari ${data?.shipments.length ?? 0} data pengiriman`}
                {activeTab === "requests" &&
                  `Menampilkan ${filteredRequests.length} dari ${data?.requests.length ?? 0} permohonan bantuan`}
                {activeTab === "events" &&
                  `Menampilkan ${filteredEvents.length} dari ${data?.events.length ?? 0} event terdaftar`}
              </p>
            </div>

            <button
              id="btn-refresh-transparency"
              type="button"
              onClick={() => load(true)}
              disabled={refreshing}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RotateCw
                className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-teal-600" : ""}`}
              />
              <span>Segarkan</span>
            </button>
          </div>

          {/* Loading state */}
          {loading ? (
            <div className="space-y-3 p-8">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-xl bg-slate-100"
                />
              ))}
            </div>
          ) : error ? (
            /* Error state */
            <div className="p-12 text-center">
              <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
              <p className="mt-3 text-sm font-semibold text-slate-800">{error}</p>
              <button
                type="button"
                onClick={() => load()}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-700"
              >
                <RotateCw className="h-3.5 w-3.5" />
                Coba Lagi
              </button>
            </div>
          ) : (
            /* Tab content */
            <>
              {activeTab === "shipments" && (
                <ShipmentsTable shipments={filteredShipments} />
              )}
              {activeTab === "requests" && (
                <RequestsTable requests={filteredRequests} />
              )}
              {activeTab === "events" && (
                <EventsTable events={filteredEvents} />
              )}
            </>
          )}
        </section>

        <footer className="mt-12 border-t border-slate-200 pt-8 text-center text-xs text-slate-400">
          <p className="font-medium text-slate-600">
            SIBANTU · Sistem Bantuan Logistik Penanggulangan Bencana
          </p>
          <p className="mt-1">
            Data portal transparansi ini diperbarui secara berkala dan dapat
            diakses masyarakat untuk pengawasan bersama.
          </p>
        </footer>
      </main>
    </div>
  );
}


function ShipmentsTable({ shipments }: { shipments: Shipment[] }) {
  if (shipments.length === 0) {
    return (
      <div className="p-12 text-center">
        <Truck className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-3 text-sm font-medium text-slate-600">
          Belum ada data pengiriman yang cocok
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Coba ubah kata kunci pencarian Anda.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          <tr>
            <th className="px-6 py-3.5">Kode Shipment</th>
            <th className="px-6 py-3.5">Event Bencana</th>
            <th className="px-6 py-3.5">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Lokasi Tujuan
              </span>
            </th>
            <th className="px-6 py-3.5">Status</th>
            <th className="px-6 py-3.5">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Tanggal
              </span>
            </th>
            <th className="px-6 py-3.5 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          {shipments.map((s) => (
            <tr key={s.id} className="transition hover:bg-slate-50/80">
              <td className="px-6 py-4">
                <span className="font-mono text-sm font-bold text-teal-700">
                  {s.shipment_code}
                </span>
                <div className="mt-0.5 text-[11px] text-slate-400">
                  Ref: <span className="font-mono">{s.request_code}</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="font-semibold text-slate-900">{s.event_name}</div>
                <div className="font-mono text-[11px] text-slate-400">
                  {s.event_code}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="font-medium text-slate-800">{s.destination_name}</div>
                {s.destination_address && (
                  <div className="mt-0.5 max-w-[220px] truncate text-[11px] text-slate-400">
                    {s.destination_address}
                  </div>
                )}
              </td>
              <td className="px-6 py-4">
                <StatusBadge status={s.status} />
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-slate-500">
                <div>{fmtDate(s.created_at)}</div>
                {s.delivered_at && (
                  <div className="text-[11px] font-medium text-emerald-600">
                    Tiba: {fmtDate(s.delivered_at)}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 text-right">
                <Link
                  href={`/transparansi/shipment/${s.id}`}
                  id={`link-shipment-${s.id}`}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:border-teal-500 hover:bg-teal-50/50 hover:text-teal-700"
                >
                  <span>Detail</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RequestsTable({ requests }: { requests: AidRequest[] }) {
  if (requests.length === 0) {
    return (
      <div className="p-12 text-center">
        <FileText className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-3 text-sm font-medium text-slate-600">
          Belum ada data permintaan bantuan yang cocok
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          <tr>
            <th className="px-6 py-3.5">Kode Permintaan</th>
            <th className="px-6 py-3.5">Event Bencana</th>
            <th className="px-6 py-3.5">Posko Pemohon</th>
            <th className="px-6 py-3.5">Status Permintaan</th>
            <th className="px-6 py-3.5">Shipment Terkait</th>
            <th className="px-6 py-3.5">Tanggal Pengajuan</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          {requests.map((r) => (
            <tr key={r.id} className="transition hover:bg-slate-50/80">
              <td className="px-6 py-4">
                <span className="font-mono text-sm font-bold text-blue-700">
                  {r.request_code}
                </span>
                {r.reason && (
                  <p className="mt-1 max-w-[200px] truncate text-[11px] text-slate-400">
                    {r.reason}
                  </p>
                )}
              </td>
              <td className="px-6 py-4">
                <div className="font-semibold text-slate-900">{r.event_name}</div>
                <div className="font-mono text-[11px] text-slate-400">
                  {r.event_code}
                </div>
              </td>
              <td className="px-6 py-4 font-medium text-slate-800">
                {r.requester_location_name}
              </td>
              <td className="px-6 py-4">
                <StatusBadge status={r.status} />
              </td>
              <td className="px-6 py-4">
                {r.shipment_code ? (
                  <div>
                    <span className="font-mono text-xs font-bold text-teal-700">
                      {r.shipment_code}
                    </span>
                    <div className="mt-1">
                      <StatusBadge status={r.shipment_status ?? ""} />
                    </div>
                  </div>
                ) : (
                  <span className="text-slate-400">–</span>
                )}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-slate-500">
                <div>{fmtDate(r.requested_at)}</div>
                {r.approved_at && (
                  <div className="text-[11px] font-medium text-blue-600">
                    Disetujui: {fmtDate(r.approved_at)}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EventsTable({ events }: { events: DisasterEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="p-12 text-center">
        <Globe className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-3 text-sm font-medium text-slate-600">
          Belum ada data event bencana yang cocok
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          <tr>
            <th className="px-6 py-3.5">Kode Event</th>
            <th className="px-6 py-3.5">Nama Bencana</th>
            <th className="px-6 py-3.5">Deskripsi</th>
            <th className="px-6 py-3.5">Status</th>
            <th className="px-6 py-3.5">Periode Penanganan</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          {events.map((e) => (
            <tr key={e.id} className="transition hover:bg-slate-50/80">
              <td className="px-6 py-4">
                <span className="font-mono text-xs font-bold text-slate-700">
                  {e.code}
                </span>
              </td>
              <td className="px-6 py-4 font-semibold text-slate-900">
                {e.name}
              </td>
              <td className="max-w-xs px-6 py-4 text-slate-500">
                {e.description ?? "–"}
              </td>
              <td className="px-6 py-4">
                <StatusBadge status={e.status} />
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-slate-500">
                <div>Mulai: {fmtDate(e.started_at)}</div>
                {e.ended_at && (
                  <div className="text-[11px] text-slate-400">
                    Selesai: {fmtDate(e.ended_at)}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
