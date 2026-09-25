"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Loader2,
  Package,
  RefreshCw,
  Search,
  Truck,
  XCircle,
} from "lucide-react";

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

type ApiResponse = {
  success: boolean;
  requests: Request[];
  message?: string;
};

type ShipmentStatus =
  | "PREPARING"
  | "READY"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED";

type Shipment = {
  id: number;
  code: string;
  status: string | null;
  requestId: number;
  requestCode: string;
  eventId: number;
  requesterLocationId: number;
  reason: string | null;
  requestedAt: string;
  approvedAt: string | null;
};

type ManifestResponse = {
  success: boolean;
  manifest?: {
    shipment: {
      id: number | string;
      event_id?: number | string;
      status: string;
    };
    leg: {
      id: number | string;
      status: string;
      from_event_location_id: number | string;
      to_event_location_id: number | string;
    };
    qr: {
      id: number | string;
      status: string;
    };
  };
  message?: string;
};

type ScanResponse = {
  success: boolean;
  scan_type?: string;
  message?: string;
};

const STATUS_CONFIG: Record<
  ShipmentStatus,
  {
    label: string;
    className: string;
    icon: React.ElementType;
  }
> = {
  PREPARING: {
    label: "Persiapan",
    className:
      "border-slate-200 bg-slate-100 text-slate-600",
    icon: Clock3,
  },

  READY: {
    label: "Siap Dikirim",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: CheckCircle2,
  },

  IN_TRANSIT: {
    label: "Dalam Perjalanan",
    className:
      "border-amber-200 bg-amber-50 text-amber-700",
    icon: Truck,
  },

  DELIVERED: {
    label: "Terkirim",
    className:
      "border-blue-200 bg-blue-50 text-blue-700",
    icon: CheckCircle2,
  },

  CANCELLED: {
    label: "Dibatalkan",
    className:
      "border-red-200 bg-red-50 text-red-700",
    icon: XCircle,
  },
};

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getStatusConfig(status: string | null) {
  if (
    status &&
    status in STATUS_CONFIG
  ) {
    return STATUS_CONFIG[
      status as ShipmentStatus
    ];
  }

  return {
    label: status || "Unknown",
    className:
      "border-slate-200 bg-slate-100 text-slate-600",
    icon: Clock3,
  };
}

export default function GudangShipmentsPage() {
  const [requests, setRequests] = useState<Request[]>(
    []
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"ALL" | ShipmentStatus>("ALL");

  const [dispatchingId, setDispatchingId] =
    useState<number | null>(null);

  async function loadShipments(
    isRefresh = false
  ) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await fetch(
        "/api/aid-requests",
        {
          cache: "no-store",
        }
      );

      const data: ApiResponse =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Gagal mengambil data shipment."
        );
      }

      setRequests(data.requests ?? []);
    } catch (err) {
      console.error(
        "Load shipment error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengambil data shipment."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadShipments();
  }, []);

  /*
   * Satu request hanya bisa mempunyai
   * satu shipment pada flow backend saat ini.
   *
   * Jadi kita bentuk shipment list dari
   * request yang memiliki shipment_id.
   */
  const shipments = useMemo<Shipment[]>(() => {
    return requests
      .filter(
        (request) =>
          request.shipment_id !== null
      )
      .map((request) => ({
        id: request.shipment_id as number,
        code:
          request.shipment_code ||
          `SHP-${request.shipment_id}`,
        status: request.shipment_status,
        requestId: request.id,
        requestCode: request.request_code,
        eventId: request.disaster_event_id,
        requesterLocationId:
          request.requester_location_id,
        reason: request.reason,
        requestedAt: request.requested_at,
        approvedAt: request.approved_at,
      }));
  }, [requests]);

  const filteredShipments = useMemo(() => {
    const keyword =
      search.trim().toLowerCase();

    return shipments.filter((shipment) => {
      const matchesSearch =
        !keyword ||
        shipment.code
          .toLowerCase()
          .includes(keyword) ||
        shipment.requestCode
          .toLowerCase()
          .includes(keyword) ||
        String(shipment.id).includes(keyword);

      const matchesStatus =
        statusFilter === "ALL" ||
        shipment.status === statusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    shipments,
    search,
    statusFilter,
  ]);

  const summary = useMemo(() => {
    return {
      total: shipments.length,

      preparing: shipments.filter(
        (shipment) =>
          shipment.status === "PREPARING"
      ).length,

      ready: shipments.filter(
        (shipment) =>
          shipment.status === "READY"
      ).length,

      inTransit: shipments.filter(
        (shipment) =>
          shipment.status === "IN_TRANSIT"
      ).length,

      delivered: shipments.filter(
        (shipment) =>
          shipment.status === "DELIVERED"
      ).length,
    };
  }, [shipments]);

  /*
   * Dispatch shipment
   *
   * Untuk MVP:
   * - lokasi gudang = event_location_id 1
   * - shipment READY harus memiliki leg
   * - QR harus ACTIVE
   * - dispatch menggunakan scan API sebagai
   *   departure scan
   *
   * Flow:
   *
   * READY
   *   ↓
   * QR Manifest
   *   ↓
   * Departure Scan @ Gudang
   *   ↓
   * Shipment IN_TRANSIT
   *   ↓
   * Petugas Posko dapat melakukan ARRIVAL scan
   */
  async function handleDispatch(
    shipmentId: number
  ) {
    try {
      setDispatchingId(shipmentId);
      setError("");

      /*
       * 1. Ambil manifest shipment.
       */
      const qrResponse = await fetch(
        `/api/shipments/${shipmentId}/qr`,
        {
          cache: "no-store",
        }
      );

      const qrData: ManifestResponse =
        await qrResponse.json();

      if (
        !qrResponse.ok ||
        !qrData.success ||
        !qrData.manifest
      ) {
        throw new Error(
          qrData.message ||
            "Gagal mengambil manifest shipment."
        );
      }

      const manifest =
        qrData.manifest;

      /*
       * 2. Normalisasi ID PostgreSQL BIGINT.
       */
      const manifestShipmentId =
        Number(manifest.shipment.id);

      const legId =
        Number(manifest.leg.id);

      const qrId =
        Number(manifest.qr.id);

      if (
        !manifestShipmentId ||
        !legId ||
        !qrId
      ) {
        throw new Error(
          "Data shipment, leg, atau QR tidak lengkap."
        );
      }

      /*
       * 3. Pastikan shipment yang dikembalikan
       *    memang shipment yang sedang di-dispatch.
       */
      if (
        manifestShipmentId !== shipmentId
      ) {
        throw new Error(
          "Manifest shipment tidak sesuai."
        );
      }

      /*
       * 4. Pastikan QR aktif.
       */
      if (
        manifest.qr.status !== "ACTIVE"
      ) {
        throw new Error(
          "QR shipment tidak aktif."
        );
      }

      /*
       * 5. Pastikan leg masih PENDING.
       *
       * Dispatch dari Gudang hanya dilakukan
       * untuk keberangkatan pertama.
       */
      if (
        manifest.leg.status !== "PENDING"
      ) {
        throw new Error(
          "Shipment sudah memiliki proses keberangkatan."
        );
      }

      /*
       * 6. Dummy lokasi Gudang Utama BPBD.
       *
       * Berdasarkan seed event:
       * 1 = Gudang Utama BPBD
       */
      const warehouseLocationId = 1;

      /*
       * 7. Pastikan leg memang berangkat
       *    dari Gudang.
       */
      if (
        Number(
          manifest.leg.from_event_location_id
        ) !== warehouseLocationId
      ) {
        throw new Error(
          "Lokasi keberangkatan shipment bukan Gudang Utama BPBD."
        );
      }

      /*
       * 8. Departure scan.
       *
       * Scan API yang sudah ada akan:
       *
       * - scan_attempt = VALID
       * - leg PENDING → IN_TRANSIT
       * - shipment READY → IN_TRANSIT
       * - dispatched_at = NOW()
       */
      const scanResponse = await fetch(
        `/api/shipments/${shipmentId}/scan`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            client_event_id:
              crypto.randomUUID(),

            shipment_leg_id: legId,

            shipment_qr_id: qrId,

            scanned_at_location_id:
              warehouseLocationId,

            /*
             * Dibuat 60 detik di masa lalu
             * supaya aman terhadap validasi:
             *
             * server_received_at >=
             * device_scanned_at
             */
            device_scanned_at:
              new Date(
                Date.now() - 60_000
              ).toISOString(),
          }),
        }
      );

      const scanData: ScanResponse =
        await scanResponse.json();

      if (
        !scanResponse.ok ||
        !scanData.success
      ) {
        throw new Error(
          scanData.message ||
            "Gagal melakukan dispatch shipment."
        );
      }

      /*
       * 9. Refresh list supaya status
       *    READY → IN_TRANSIT langsung terlihat.
       */
      await loadShipments(true);
    } catch (err) {
      console.error(
        "Dispatch shipment error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Gagal melakukan dispatch shipment."
      );
    } finally {
      setDispatchingId(null);
    }
  }

  if (loading) {
    return <LoadingState />;
  }

  return (
    <main className="space-y-6">
      {/* Header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
              <Truck className="h-5 w-5" />
            </div>

            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Shipment
            </h1>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Kelola pengiriman bantuan dari gudang
            menuju lokasi tujuan.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            loadShipments(true)
          }
          disabled={refreshing}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            className={
              refreshing
                ? "h-4 w-4 animate-spin"
                : "h-4 w-4"
            }
          />

          Refresh
        </button>
      </section>

      {/* Error */}
      {error && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

            <div>
              <p className="text-sm font-bold text-red-800">
                Proses gagal
              </p>

              <p className="mt-1 text-sm text-red-700">
                {error}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Summary */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard
          label="Total"
          value={summary.total}
          icon={Package}
        />

        <SummaryCard
          label="Persiapan"
          value={summary.preparing}
          icon={Clock3}
          valueClassName="text-slate-700"
        />

        <SummaryCard
          label="Siap Dikirim"
          value={summary.ready}
          icon={CheckCircle2}
          valueClassName="text-emerald-600"
        />

        <SummaryCard
          label="Dalam Perjalanan"
          value={summary.inTransit}
          icon={Truck}
          valueClassName="text-amber-600"
        />

        <SummaryCard
          label="Terkirim"
          value={summary.delivered}
          icon={CheckCircle2}
          valueClassName="text-blue-600"
        />
      </section>

      {/* Filters */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Cari shipment atau request..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
            />
          </div>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as
                  | "ALL"
                  | ShipmentStatus
              )
            }
            className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
          >
            <option value="ALL">
              Semua Status
            </option>

            <option value="PREPARING">
              Persiapan
            </option>

            <option value="READY">
              Siap Dikirim
            </option>

            <option value="IN_TRANSIT">
              Dalam Perjalanan
            </option>

            <option value="DELIVERED">
              Terkirim
            </option>

            <option value="CANCELLED">
              Dibatalkan
            </option>
          </select>
        </div>
      </section>

      {/* Desktop Table */}
      <section className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Daftar Shipment
              </h2>

              <p className="mt-0.5 text-xs text-slate-400">
                {filteredShipments.length} shipment
                ditampilkan
              </p>
            </div>
          </div>
        </div>

        {filteredShipments.length === 0 ? (
          <EmptyState
            hasFilter={
              Boolean(search) ||
              statusFilter !== "ALL"
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Shipment
                  </th>

                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Request
                  </th>

                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Status
                  </th>

                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Dibuat
                  </th>

                  <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredShipments.map(
                  (shipment) => {
                    const status =
                      getStatusConfig(
                        shipment.status
                      );

                    const StatusIcon =
                      status.icon;

                    const isDispatching =
                      dispatchingId ===
                      shipment.id;

                    return (
                      <tr
                        key={shipment.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <p className="font-mono text-sm font-bold text-teal-700">
                            {shipment.code}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            ID #{shipment.id}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <Link
                            href={`/dashboard/admin/requests/${shipment.requestId}`}
                            className="font-mono text-xs font-semibold text-slate-700 hover:text-teal-600"
                          >
                            {shipment.requestCode}
                          </Link>

                          <p className="mt-1 text-xs text-slate-400">
                            Request disetujui
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${status.className}`}
                          >
                            <StatusIcon className="h-3.5 w-3.5" />
                            {status.label}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {formatDate(
                            shipment.requestedAt
                          )}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Link
                              href={`/dashboard/gudang/shipments/${shipment.id}`}
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-teal-200 hover:text-teal-700"
                            >
                              Detail
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>

                            {shipment.status ===
                              "READY" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDispatch(
                                      shipment.id
                                    )
                                  }
                                  disabled={
                                    isDispatching
                                  }
                                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-teal-600 px-3 text-xs font-bold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isDispatching ? (
                                    <>
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      Dispatch...
                                    </>
                                  ) : (
                                    <>
                                      <Truck className="h-3.5 w-3.5" />
                                      Dispatch
                                    </>
                                  )}
                                </button>

                                <Link
                                  href={`/dashboard/gudang/shipments/${shipment.id}/qr`}
                                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-teal-200 hover:text-teal-700"
                                >
                                  <Package className="h-3.5 w-3.5" />
                                  QR
                                </Link>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Mobile */}
      <section className="space-y-3 md:hidden">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Daftar Shipment
          </h2>

          <p className="mt-0.5 text-xs text-slate-400">
            {filteredShipments.length} shipment
            ditampilkan
          </p>
        </div>

        {filteredShipments.length === 0 ? (
          <EmptyState
            hasFilter={
              Boolean(search) ||
              statusFilter !== "ALL"
            }
          />
        ) : (
          filteredShipments.map(
            (shipment) => {
              const status =
                getStatusConfig(
                  shipment.status
                );

              const StatusIcon =
                status.icon;

              const isDispatching =
                dispatchingId ===
                shipment.id;

              return (
                <article
                  key={shipment.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-bold text-teal-700">
                        {shipment.code}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {shipment.requestCode}
                      </p>
                    </div>

                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold ${status.className}`}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Request
                      </p>

                      <p className="mt-1 text-xs font-semibold text-slate-700">
                        {shipment.requestCode}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Dibuat
                      </p>

                      <p className="mt-1 text-xs font-semibold text-slate-700">
                        {formatDate(
                          shipment.requestedAt
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Link
                      href={`/dashboard/gudang/shipments/${shipment.id}`}
                      className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Detail
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>

                    {shipment.status ===
                      "READY" && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            handleDispatch(
                              shipment.id
                            )
                          }
                          disabled={
                            isDispatching
                          }
                          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-teal-600 text-xs font-bold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isDispatching ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Dispatch...
                            </>
                          ) : (
                            <>
                              <Truck className="h-3.5 w-3.5" />
                              Dispatch
                            </>
                          )}
                        </button>

                        <Link
                          href={`/dashboard/gudang/shipments/${shipment.id}/qr`}
                          className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          <Package className="h-3.5 w-3.5" />
                          QR
                        </Link>
                      </>
                    )}
                  </div>
                </article>
              );
            }
          )
        )}
      </section>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  valueClassName = "text-slate-900",
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>

        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <p
        className={`mt-3 text-2xl font-bold ${valueClassName}`}
      >
        {value.toLocaleString("id-ID")}
      </p>
    </div>
  );
}

function EmptyState({
  hasFilter,
}: {
  hasFilter: boolean;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-14 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        <Truck className="h-6 w-6" />
      </div>

      <p className="mt-4 text-sm font-bold text-slate-700">
        {hasFilter
          ? "Shipment tidak ditemukan"
          : "Belum ada shipment"}
      </p>

      <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-400">
        {hasFilter
          ? "Coba ubah kata pencarian atau filter status."
          : "Shipment akan muncul setelah permintaan bantuan yang disetujui diproses oleh gudang."}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <main className="space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded bg-slate-200" />

        <div className="h-4 w-80 animate-pulse rounded bg-slate-200" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map(
          (_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-2xl bg-white"
            />
          )
        )}
      </div>

      <div className="h-20 animate-pulse rounded-2xl bg-white" />

      <div className="h-96 animate-pulse rounded-2xl bg-white" />
    </main>
  );
}