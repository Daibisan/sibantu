"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  Clock3,
  Package,
  RefreshCw,
  Siren,
  Truck,
} from "lucide-react";

type Event = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  status: string;
  started_at: string;
  ended_at: string | null;
  created_at: string;
};

type Request = {
  id: number;
  request_code: string;
  disaster_event_id: number;
  requester_location_id: number;
  submitted_by: number;
  status: string;
  reason: string | null;
  requested_at: string;
  approved_at: string | null;
  shipment_id: number | null;
  shipment_code: string | null;
  shipment_status: string | null;
};

type InventoryItem = {
  id?: number;
  name?: string;
  code?: string;
  item_name?: string;
  available_qty?: number | string;
  quantity?: number | string;
  stock?: number | string;
  reserved_qty?: number | string;
};

type DashboardData = {
  events: Event[];
  requests: Request[];
  inventory: InventoryItem[];
};

function getStatusClass(status: string) {
  switch (status.toUpperCase()) {
    case "ACTIVE":
    case "APPROVED":
    case "DELIVERED":
    case "RECEIVED":
      return "bg-emerald-50 text-emerald-700";

    case "PENDING":
    case "SUBMITTED":
    case "PREPARING":
    case "READY":
      return "bg-amber-50 text-amber-700";

    case "IN_TRANSIT":
      return "bg-sky-50 text-sky-700";

    case "REJECTED":
    case "CANCELLED":
      return "bg-red-50 text-red-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(date: string | null) {
  if (!date) return "-";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return parsedDate.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInventoryAvailable(item: InventoryItem) {
  const value =
    item.available_qty ??
    item.quantity ??
    item.stock ??
    0;

  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

async function parseResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData>({
    events: [],
    requests: [],
    inventory: [],
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function loadDashboard(showRefresh = false) {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [
        eventsResponse,
        requestsResponse,
        inventoryResponse,
      ] = await Promise.all([
        fetch("/api/events", {
          cache: "no-store",
        }),
        fetch("/api/aid-requests", {
          cache: "no-store",
        }),
        fetch("/api/inventory", {
          cache: "no-store",
        }),
      ]);

      const [
        eventsData,
        requestsData,
        inventoryData,
      ] = await Promise.all([
        parseResponse(eventsResponse),
        parseResponse(requestsResponse),
        parseResponse(inventoryResponse),
      ]);

      if (!eventsResponse.ok) {
        throw new Error(
          eventsData.message ||
            "Gagal mengambil data event."
        );
      }

      if (!requestsResponse.ok) {
        throw new Error(
          requestsData.message ||
            "Gagal mengambil data permintaan."
        );
      }

      if (!inventoryResponse.ok) {
        throw new Error(
          inventoryData.message ||
            "Gagal mengambil data inventory."
        );
      }

      setData({
        events:
          eventsData.events ??
          eventsData.data ??
          [],

        requests:
          requestsData.requests ??
          requestsData.data ??
          [],

        inventory:
          inventoryData.inventory ??
          inventoryData.items ??
          inventoryData.data ??
          [],
      });
    } catch (error) {
      console.error(
        "Gagal mengambil dashboard:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Gagal mengambil data dashboard."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const activeEvents = useMemo(() => {
    return data.events.filter(
      (event) =>
        event.status.toUpperCase() === "ACTIVE"
    );
  }, [data.events]);

  const pendingRequests = useMemo(() => {
    return data.requests.filter((request) =>
      ["PENDING", "SUBMITTED"].includes(
        request.status.toUpperCase()
      )
    );
  }, [data.requests]);

  const approvedRequests = useMemo(() => {
    return data.requests.filter(
      (request) =>
        request.status.toUpperCase() === "APPROVED"
    );
  }, [data.requests]);

  const activeShipments = useMemo(() => {
    return data.requests.filter((request) =>
      ["PREPARING", "READY", "IN_TRANSIT"].includes(
        (request.shipment_status ?? "").toUpperCase()
      )
    );
  }, [data.requests]);

  const deliveredShipments = useMemo(() => {
    return data.requests.filter(
      (request) =>
        (request.shipment_status ?? "").toUpperCase() ===
        "DELIVERED"
    );
  }, [data.requests]);

  const approvedWithoutShipment = useMemo(() => {
    return data.requests.filter(
      (request) =>
        request.status.toUpperCase() === "APPROVED" &&
        !request.shipment_id
    );
  }, [data.requests]);

  const recentRequests = useMemo(() => {
    return [...data.requests]
      .sort(
        (a, b) =>
          new Date(b.requested_at).getTime() -
          new Date(a.requested_at).getTime()
      )
      .slice(0, 6);
  }, [data.requests]);

  const totalAvailableStock = useMemo(() => {
    return data.inventory.reduce(
      (total, item) =>
        total + getInventoryAvailable(item),
      0
    );
  }, [data.inventory]);

  const activeEvent = activeEvents[0] ?? null;

  return (
    <main className="space-y-6">
      {/* =====================================================
          HEADER
      ====================================================== */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-teal-600">
            <Activity className="h-4 w-4" />
            Command Center
          </div>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Dashboard Admin
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Monitoring kejadian bencana, permintaan
            bantuan, distribusi, dan persediaan logistik.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadDashboard(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            className={[
              "h-4 w-4",
              refreshing ? "animate-spin" : "",
            ].join(" ")}
          />

          {refreshing ? "Memuat..." : "Refresh"}
        </button>
      </section>

      {/* =====================================================
          ERROR
      ====================================================== */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

          <div>
            <p className="text-sm font-semibold text-red-800">
              Gagal memuat dashboard
            </p>

            <p className="mt-1 text-sm text-red-700">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* =====================================================
          ACTIVE EVENT
      ====================================================== */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Siren className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Kejadian Aktif
              </p>

              {loading ? (
                <div className="mt-2 h-6 w-52 animate-pulse rounded bg-slate-100" />
              ) : activeEvent ? (
                <h2 className="mt-1 truncate text-lg font-bold text-slate-900">
                  {activeEvent.name}
                </h2>
              ) : (
                <h2 className="mt-1 text-lg font-bold text-slate-900">
                  Tidak ada event aktif
                </h2>
              )}
            </div>
          </div>

          {activeEvent && (
            <Link
              href={`/dashboard/admin/events/${activeEvent.id}`}
              className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-teal-600 hover:text-teal-700"
            >
              Lihat event
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        {activeEvent && (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                Kode Event
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-900">
                {activeEvent.code}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                Status
              </p>

              <span className="mt-1 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                Aktif
              </span>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                Mulai
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-900">
                {formatDate(activeEvent.started_at)}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* =====================================================
          STATISTICS
      ====================================================== */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Permintaan Masuk"
          value={data.requests.length}
          description={`${pendingRequests.length} menunggu tindakan`}
          icon={ClipboardList}
          loading={loading}
        />

        <StatCard
          label="Perlu Verifikasi"
          value={pendingRequests.length}
          description="Permintaan belum diproses"
          icon={Clock3}
          loading={loading}
          urgent={pendingRequests.length > 0}
        />

        <StatCard
          label="Shipment Berjalan"
          value={activeShipments.length}
          description="Preparing, ready, atau transit"
          icon={Truck}
          loading={loading}
        />

        <StatCard
          label="Stok Tersedia"
          value={totalAvailableStock.toLocaleString(
            "id-ID"
          )}
          description={`${data.inventory.length} jenis barang`}
          icon={Package}
          loading={loading}
        />
      </section>

      {/* =====================================================
          MAIN CONTENT
      ====================================================== */}
      <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        {/* ===================================================
            REQUESTS
        ==================================================== */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
            <div>
              <h2 className="font-semibold text-slate-900">
                Permintaan Terbaru
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Status permintaan bantuan terbaru
              </p>
            </div>

            <Link
              href="/dashboard/admin/requests"
              className="inline-flex items-center gap-1 text-sm font-semibold text-teal-600 hover:text-teal-700"
            >
              Lihat semua
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {loading ? (
              <RequestSkeleton />
            ) : recentRequests.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="Belum ada permintaan"
                description="Belum ada data permintaan bantuan."
              />
            ) : (
              recentRequests.map((request) => (
                <Link
                  key={request.id}
                  href={`/dashboard/admin/requests/${request.id}`}
                  className="block px-5 py-4 transition-colors hover:bg-slate-50 sm:px-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {request.request_code}
                      </p>

                      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock3 className="h-3.5 w-3.5" />
                        {formatDate(request.requested_at)}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                        request.status
                      )}`}
                    >
                      {formatStatus(request.status)}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                    <span>
                      Event #{request.disaster_event_id}
                    </span>

                    {request.shipment_code && (
                      <span className="inline-flex items-center gap-1">
                        <Truck className="h-3.5 w-3.5" />
                        {request.shipment_code}
                      </span>
                    )}

                    {request.shipment_status && (
                      <span
                        className={`rounded-full px-2 py-0.5 font-medium ${getStatusClass(
                          request.shipment_status
                        )}`}
                      >
                        Shipment{" "}
                        {formatStatus(
                          request.shipment_status
                        )}
                      </span>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* ===================================================
            RIGHT COLUMN
        ==================================================== */}
        <div className="space-y-6">
          {/* Distribution */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
              <h2 className="font-semibold text-slate-900">
                Status Distribusi
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Ringkasan proses distribusi bantuan
              </p>
            </div>

            <div className="space-y-3 p-5 sm:p-6">
              <SummaryRow
                label="Disetujui, belum shipment"
                value={approvedWithoutShipment.length}
              />

              <SummaryRow
                label="Shipment berjalan"
                value={activeShipments.length}
              />

              <SummaryRow
                label="Terkirim"
                value={deliveredShipments.length}
              />

              <SummaryRow
                label="Permintaan disetujui"
                value={approvedRequests.length}
              />
            </div>

            <div className="border-t border-slate-200 p-5 sm:p-6">
              <Link
                href="/dashboard/gudang"
                className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Buka modul gudang

                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
            </div>
          </div>

          {/* Events */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Event Bencana
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Daftar kejadian yang terdaftar
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                {data.events.length}
              </span>
            </div>

            <div className="p-5 sm:p-6">
              {loading ? (
                <div className="space-y-3">
                  <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
                  <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
                </div>
              ) : data.events.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Belum ada event.
                </p>
              ) : (
                <div className="space-y-2">
                  {data.events.slice(0, 4).map((event) => (
                    <Link
                      key={event.id}
                      href={`/dashboard/admin/events/${event.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-3 transition hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {event.name}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500">
                          {event.code}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${getStatusClass(
                          event.status
                        )}`}
                      >
                        {formatStatus(event.status)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              <Link
                href="/dashboard/admin/events"
                className="mt-4 flex items-center justify-center gap-1.5 text-sm font-semibold text-teal-600 hover:text-teal-700"
              >
                Kelola event
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
  description,
  icon: Icon,
  loading,
  urgent = false,
}: {
  label: string;
  value: number | string;
  description: string;
  icon: React.ElementType;
  loading: boolean;
  urgent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </p>

          {loading ? (
            <div className="mt-3 h-8 w-20 animate-pulse rounded bg-slate-100" />
          ) : (
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
              {value}
            </p>
          )}
        </div>

        <div
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            urgent
              ? "bg-amber-50 text-amber-600"
              : "bg-teal-50 text-teal-600",
          ].join(" ")}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {description}
      </p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
      <span className="text-sm text-slate-600">
        {label}
      </span>

      <span className="text-sm font-bold text-slate-900">
        {value}
      </span>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        <Icon className="h-5 w-5" />
      </div>

      <p className="mt-3 text-sm font-semibold text-slate-900">
        {title}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {description}
      </p>
    </div>
  );
}

function RequestSkeleton() {
  return (
    <div className="space-y-3 p-5 sm:p-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-xl bg-slate-50 p-4"
        >
          <div className="h-4 w-32 rounded bg-slate-200" />

          <div className="mt-2 h-3 w-48 rounded bg-slate-100" />

          <div className="mt-3 h-3 w-24 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}