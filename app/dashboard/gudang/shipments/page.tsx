"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Package,
  Plus,
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

  event_code?: string | null;
  event_name?: string | null;
  requester_location_name?: string | null;
  submitted_by_name?: string | null;
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

function normalizeRequests(
  requests: Request[]
): Request[] {
  return requests.map((request) => ({
    ...request,
    id: Number(request.id),
    disaster_event_id: Number(
      request.disaster_event_id
    ),
    requester_location_id: Number(
      request.requester_location_id
    ),
    submitted_by: Number(request.submitted_by),
    shipment_id:
      request.shipment_id === null
        ? null
        : Number(request.shipment_id),
  }));
}

function formatDate(value: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("id-ID", {
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

  const [creatingShipmentId, setCreatingShipmentId] =
    useState<number | null>(null);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState<"ALL" | ShipmentStatus>("ALL");

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
      setSuccessMessage("");

      const response = await fetch(
        "/api/aid-requests",
        {
          cache: "no-store",
          credentials: "include",
        }
      );

      const data: ApiResponse =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Gagal mengambil data request dan shipment."
        );
      }

      setRequests(
        normalizeRequests(data.requests ?? [])
      );
    } catch (err) {
      console.error(
        "Load shipment error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengambil data request dan shipment."
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
   * ==========================================================
   * REQUEST APPROVED YANG BELUM MEMILIKI SHIPMENT
   * ==========================================================
   *
   * Inilah data yang sebelumnya hilang dari halaman.
   *
   * Flow:
   *
   * APPROVED + shipment_id null
   *          ↓
   *      Buat Shipment
   *          ↓
   * /api/aid-requests/[id]/shipments
   */
  const pendingShipmentRequests = useMemo(() => {
    return requests.filter(
      (request) =>
        request.status === "APPROVED" &&
        request.shipment_id === null
    );
  }, [requests]);

  /*
   * ==========================================================
   * SHIPMENT YANG SUDAH ADA
   * ==========================================================
   */
  const shipments = useMemo(() => {
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
        locationName:
          request.requester_location_name ||
          "-",
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
        shipment.locationName
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
   * ==========================================================
   * CREATE SHIPMENT
   * ==========================================================
   */
  async function createShipment(
    requestId: number
  ) {
    try {
      setCreatingShipmentId(requestId);
      setError("");
      setSuccessMessage("");

      const response = await fetch(
        `/api/aid-requests/${requestId}/shipments`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Gagal membuat shipment."
        );
      }

      setSuccessMessage(
        data.message ||
          "Shipment berhasil dibuat."
      );

      /*
       * Refresh request + shipment list.
       *
       * Request yang tadinya:
       *
       * APPROVED + shipment_id null
       *
       * akan berubah menjadi:
       *
       * APPROVED + shipment_id terisi
       *
       * sehingga otomatis pindah dari
       * pendingShipmentRequests ke shipments.
       */
      await loadShipments(true);
    } catch (err) {
      console.error(
        "Create shipment error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Gagal membuat shipment."
      );
    } finally {
      setCreatingShipmentId(null);
    }
  }

  if (loading) {
    return <LoadingState />;
  }

  return (
    <main className="space-y-6">
      {/* ================================================== */}
      {/* HEADER                                             */}
      {/* ================================================== */}

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
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
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

      {/* ================================================== */}
      {/* SUCCESS                                            */}
      {/* ================================================== */}

      {successMessage && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

            <div>
              <p className="text-sm font-bold text-emerald-800">
                Berhasil
              </p>

              <p className="mt-1 text-sm text-emerald-700">
                {successMessage}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ================================================== */}
      {/* ERROR                                              */}
      {/* ================================================== */}

      {error && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

            <div>
              <p className="text-sm font-bold text-red-800">
                Gagal memproses shipment
              </p>

              <p className="mt-1 text-sm text-red-700">
                {error}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ================================================== */}
      {/* APPROVED REQUESTS                                  */}
      {/* ================================================== */}

      <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
        <div className="border-b border-emerald-100 bg-emerald-50/60 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Package className="h-4 w-4" />
                </div>

                <h2 className="text-sm font-bold text-slate-900">
                  Permintaan Disetujui
                </h2>
              </div>

              <p className="mt-1 text-xs text-slate-500">
                Request yang sudah disetujui tetapi
                belum dibuatkan shipment.
              </p>
            </div>

            <span className="inline-flex w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
              {pendingShipmentRequests.length} menunggu
            </span>
          </div>
        </div>

        {pendingShipmentRequests.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>

            <p className="mt-3 text-sm font-bold text-slate-700">
              Tidak ada request yang menunggu shipment
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Semua request yang disetujui sudah
              diproses atau belum ada approval baru.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[850px]">
                <thead>
                  <tr className="border-b border-emerald-100 bg-white text-left">
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Request
                    </th>

                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Lokasi
                    </th>

                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Approval
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {pendingShipmentRequests.map(
                    (request) => {
                      const isCreating =
                        creatingShipmentId ===
                        request.id;

                      return (
                        <tr
                          key={request.id}
                          className="transition hover:bg-emerald-50/30"
                        >
                          <td className="px-5 py-4">
                            <Link
                              href={`/dashboard/admin/requests/${request.id}`}
                              className="font-mono text-sm font-bold text-slate-800 hover:text-teal-600"
                            >
                              {request.request_code}
                            </Link>

                            <p className="mt-1 max-w-md truncate text-xs text-slate-400">
                              {request.reason ||
                                "Tidak ada alasan"}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-semibold text-slate-700">
                              {request.requester_location_name ||
                                "-"}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {request.event_code ||
                                `Event #${request.disaster_event_id}`}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              APPROVED
                            </div>

                            <p className="mt-1 text-xs text-slate-400">
                              {formatDate(
                                request.approved_at
                              )}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                createShipment(
                                  request.id
                                )
                              }
                              disabled={
                                creatingShipmentId !==
                                  null
                              }
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-teal-600 px-3 text-xs font-bold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isCreating ? (
                                <>
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                  Membuat...
                                </>
                              ) : (
                                <>
                                  <Plus className="h-3.5 w-3.5" />
                                  Buat Shipment
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="divide-y divide-slate-100 md:hidden">
              {pendingShipmentRequests.map(
                (request) => {
                  const isCreating =
                    creatingShipmentId ===
                    request.id;

                  return (
                    <article
                      key={request.id}
                      className="p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Link
                            href={`/dashboard/admin/requests/${request.id}`}
                            className="font-mono text-sm font-bold text-slate-800"
                          >
                            {request.request_code}
                          </Link>

                          <p className="mt-1 text-xs text-slate-400">
                            {request.requester_location_name ||
                              "-"}
                          </p>
                        </div>

                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          APPROVED
                        </span>
                      </div>

                      <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                        {request.reason ||
                          "Tidak ada alasan"}
                      </p>

                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Disetujui
                          </p>

                          <p className="mt-1 text-xs font-medium text-slate-600">
                            {formatDate(
                              request.approved_at
                            )}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            createShipment(
                              request.id
                            )
                          }
                          disabled={
                            creatingShipmentId !==
                              null
                          }
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-teal-600 px-3 text-xs font-bold text-white disabled:opacity-60"
                        >
                          {isCreating ? (
                            <>
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              Membuat...
                            </>
                          ) : (
                            <>
                              <Plus className="h-3.5 w-3.5" />
                              Buat Shipment
                            </>
                          )}
                        </button>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          </>
        )}
      </section>

      {/* ================================================== */}
      {/* SUMMARY                                            */}
      {/* ================================================== */}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard
          label="Total Shipment"
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

      {/* ================================================== */}
      {/* FILTER                                             */}
      {/* ================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Cari shipment, request, atau lokasi..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
            />
          </div>

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

      {/* ================================================== */}
      {/* SHIPMENT LIST                                      */}
      {/* ================================================== */}

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
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Shipment
                  </th>

                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Request
                  </th>

                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Tujuan
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
                          <p className="max-w-[220px] truncate text-sm font-medium text-slate-700">
                            {shipment.locationName}
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
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:border-teal-200 hover:text-teal-700"
                            >
                              Detail
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>

                            {shipment.status ===
                              "READY" && (
                              <Link
                                href={`/dashboard/gudang/shipments/${shipment.id}/qr`}
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-teal-600 px-3 text-xs font-bold text-white transition hover:bg-teal-700"
                              >
                                <Package className="h-3.5 w-3.5" />
                                QR
                              </Link>
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

      {/* ================================================== */}
      {/* MOBILE SHIPMENT LIST                               */}
      {/* ================================================== */}

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

                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Tujuan
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {shipment.locationName}
                    </p>
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
                      <Link
                        href={`/dashboard/gudang/shipments/${shipment.id}/qr`}
                        className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-teal-600 text-xs font-bold text-white hover:bg-teal-700"
                      >
                        <Package className="h-3.5 w-3.5" />
                        QR
                      </Link>
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

/* -------------------------------------------------------------------------- */
/* Summary Card                                                               */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* Empty State                                                                */
/* -------------------------------------------------------------------------- */

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
          : "Shipment akan muncul setelah request yang disetujui diproses oleh gudang."}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Loading                                                                    */
/* -------------------------------------------------------------------------- */

function LoadingState() {
  return (
    <main className="space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-80 animate-pulse rounded bg-slate-200" />
      </div>

      <div className="h-32 animate-pulse rounded-2xl bg-white" />

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
