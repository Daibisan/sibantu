"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PackageCheck,
  Truck,
  MapPin,
  Clock3,
  Package,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Route,
} from "lucide-react";

type ShipmentStatus =
  | "PREPARING"
  | "READY"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED";

type RequestItem = {
  id: number;
  aid_item_id: number;
  item_code?: string;
  item_name?: string;
  name?: string;
  unit?: string;
  quantity: number;
  approved_quantity?: number;
};

type ShipmentData = {
  id: number | string;
  shipment_code?: string | null;
  request_id?: number | string;
  status: ShipmentStatus;
  created_at?: string;
  dispatched_at?: string | null;
  delivered_at?: string | null;
};

type AidRequest = {
  id: number;
  request_code: string;
  disaster_event_id: number;
  requester_location_id: number;

  requester_location_name?: string;
  location_name?: string;

  submitted_by?: number;
  submitted_by_name?: string;

  status: string;
  requested_at: string;
  approved_at?: string | null;

  /*
   * Support flat response
   */
  shipment_id?: number | string | null;
  shipment_code?: string | null;
  shipment_status?: ShipmentStatus | null;

  /*
   * Support nested response
   */
  shipment?: ShipmentData | null;

  items?: RequestItem[];
};

type ApiResponse = {
  success: boolean;
  requests?: AidRequest[];
  message?: string;
};

type ManifestItem = {
  id: number;
  request_item_id?: number;
  quantity: number;
  status: string;
  item_code?: string;
  item_name?: string;
  unit?: string;
};

type ManifestShipment = {
  id: number | string;
  shipment_code: string;
  request_id: number | string;
  event_id?: number | string;
  status: ShipmentStatus;
  created_at: string;
  dispatched_at?: string | null;
  delivered_at?: string | null;
};

type ManifestLeg = {
  id: number | string;
  sequence_no: number;
  from_event_location_id: number;
  to_event_location_id: number;
  status: string;
  dispatched_at?: string | null;
  arrived_at?: string | null;
  from_location_name?: string;
  to_location_name?: string;
};

type ManifestQr = {
  id: number | string;
  public_token: string;
  status: string;
  generated_at: string;
};

type Manifest = {
  shipment: ManifestShipment;
  leg: ManifestLeg;
  items: ManifestItem[];
  qr: ManifestQr;
};

type ManifestResponse = {
  success: boolean;
  manifest?: Manifest;
  message?: string;
};

type LegsResponse = {
  success: boolean;
  legs?: ManifestLeg[];
  message?: string;
};

type ReadyShipment = AidRequest & {
  shipmentId: number;
  shipmentStatus: ShipmentStatus;
  shipmentCode: string;
};

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function normalizeId(value: number | string | null | undefined) {
  if (value === null || value === undefined) return null;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function getDestination(request: AidRequest) {
  return (
    request.requester_location_name ||
    request.location_name ||
    "Lokasi tujuan"
  );
}

export default function DispatchPage() {
  const router = useRouter();

  const [requests, setRequests] = useState<AidRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedRequest, setSelectedRequest] =
    useState<ReadyShipment | null>(null);

  const [manifest, setManifest] = useState<Manifest | null>(null);

  const [loadingManifest, setLoadingManifest] = useState(false);
  const [dispatching, setDispatching] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadRequests(showRefresh = false) {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await fetch("/api/aid-requests", {
        cache: "no-store",
      });

      const data: ApiResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Gagal mengambil data permintaan bantuan."
        );
      }

      setRequests(data.requests ?? []);
    } catch (err) {
      console.error("Load dispatch requests error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengambil data permintaan bantuan."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  /*
   * Normalize shipment data.
   *
   * API bisa mengembalikan:
   *
   * shipment_id
   * shipment_code
   * shipment_status
   *
   * atau:
   *
   * shipment: {
   *   id,
   *   shipment_code,
   *   status
   * }
   */
  const normalizedShipments = useMemo(() => {
    return requests
      .map((request) => {
        const shipmentId = normalizeId(
          request.shipment_id ?? request.shipment?.id
        );

        const shipmentStatus =
          request.shipment_status ??
          request.shipment?.status ??
          null;

        const shipmentCode =
          request.shipment_code ??
          request.shipment?.shipment_code ??
          null;

        return {
          ...request,
          shipmentId,
          shipmentStatus,
          shipmentCode,
        };
      })
      .filter(
        (
          request
        ): request is ReadyShipment =>
          request.shipmentId !== null &&
          request.shipmentStatus !== null &&
          request.shipmentCode !== null
      );
  }, [requests]);

  const readyShipments = useMemo(() => {
    return normalizedShipments.filter(
      (request) => request.shipmentStatus === "READY"
    );
  }, [normalizedShipments]);

  const inTransitCount = useMemo(() => {
    return normalizedShipments.filter(
      (request) => request.shipmentStatus === "IN_TRANSIT"
    ).length;
  }, [normalizedShipments]);

  const totalShipmentCount = normalizedShipments.length;

  /**
   * Pastikan shipment memiliki route leg.
   *
   * Flow:
   * READY shipment
   *      ↓
   * GET legs
   *      ↓
   * belum ada leg?
   *      ↓
   * POST leg pertama
   *      ↓
   * GET manifest
   */
  async function ensureShipmentLeg(
    request: ReadyShipment
  ): Promise<ManifestLeg> {
    const shipmentId = request.shipmentId;

    /*
     * Request harus memiliki lokasi tujuan.
     */
    const destinationId = normalizeId(
      request.requester_location_id
    );

    if (!destinationId) {
      throw new Error(
        "Lokasi tujuan request tidak tersedia. Shipment tidak dapat dibuatkan rute."
      );
    }

    /*
     * 1. Cek apakah shipment sudah memiliki leg.
     */
    const legsResponse = await fetch(
      `/api/shipments/${shipmentId}/legs`,
      {
        cache: "no-store",
      }
    );

    const legsData: LegsResponse = await legsResponse.json();

    if (!legsResponse.ok || !legsData.success) {
      throw new Error(
        legsData.message || "Gagal mengambil rute shipment."
      );
    }

    const existingLegs = legsData.legs ?? [];

    /*
     * Kalau sudah ada leg, gunakan leg pertama
     * untuk manifest dispatch.
     */
    if (existingLegs.length > 0) {
      const firstLeg = existingLegs[0];

      if (!firstLeg?.id) {
        throw new Error(
          "Data leg shipment tidak valid."
        );
      }

      return firstLeg;
    }

    /*
     * 2. Belum ada leg.
     *
     * Buat leg pertama:
     *
     * Gudang aktif event
     *          ↓
     * requester_location_id
     */
    const createLegResponse = await fetch(
      `/api/shipments/${shipmentId}/legs`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to_event_location_id: destinationId,
        }),
      }
    );

    const createLegData: LegsResponse =
      await createLegResponse.json();

    if (!createLegResponse.ok || !createLegData.success) {
      throw new Error(
        createLegData.message ||
          "Gagal membuat rute pengiriman shipment."
      );
    }

    const createdLegs = createLegData.legs ?? [];

    /*
     * Endpoint POST idealnya mengembalikan legs.
     *
     * Kalau tidak, ambil ulang menggunakan GET.
     */
    if (createdLegs.length > 0) {
      const createdLeg = createdLegs[0];

      if (!createdLeg?.id) {
        throw new Error(
          "Rute berhasil dibuat tetapi data leg tidak valid."
        );
      }

      return createdLeg;
    }

    /*
     * Fallback:
     * GET ulang setelah POST.
     */
    const reloadLegResponse = await fetch(
      `/api/shipments/${shipmentId}/legs`,
      {
        cache: "no-store",
      }
    );

    const reloadLegData: LegsResponse =
      await reloadLegResponse.json();

    if (
      !reloadLegResponse.ok ||
      !reloadLegData.success ||
      !reloadLegData.legs?.length
    ) {
      throw new Error(
        "Rute shipment berhasil diproses tetapi leg belum tersedia."
      );
    }

    return reloadLegData.legs[0];
  }

  async function openDispatch(request: ReadyShipment) {
    const shipmentId = request.shipmentId;

    setSelectedRequest(request);
    setManifest(null);
    setError("");
    setSuccess("");
    setLoadingManifest(true);

    try {
      /*
       * STEP 1
       * Pastikan shipment sudah punya route leg.
       */
      await ensureShipmentLeg(request);

      /*
       * STEP 2
       * Setelah leg tersedia, baru ambil manifest.
       */
      const response = await fetch(
        `/api/shipments/${shipmentId}/qr`,
        {
          cache: "no-store",
        }
      );

      const data: ManifestResponse =
        await response.json();

      if (
        !response.ok ||
        !data.success ||
        !data.manifest
      ) {
        throw new Error(
          data.message ||
            "Gagal mengambil manifest shipment."
        );
      }

      setManifest(data.manifest);
    } catch (err) {
      console.error(
        "Load shipment manifest error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengambil manifest shipment."
      );
    } finally {
      setLoadingManifest(false);
    }
  }

  function closeDispatch() {
    if (dispatching) return;

    setSelectedRequest(null);
    setManifest(null);
    setError("");
    setSuccess("");
  }

  async function handleDispatch() {
    if (!manifest?.shipment?.id) {
      setError("Manifest shipment belum tersedia.");
      return;
    }

    if (!manifest.leg?.id) {
      setError(
        "Shipment belum memiliki leg pengiriman."
      );
      return;
    }

    if (manifest.shipment.status !== "READY") {
      setError(
        `Shipment tidak dapat di-dispatch karena statusnya ${manifest.shipment.status}.`
      );
      return;
    }

    try {
      setDispatching(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/shipments/${manifest.shipment.id}/dispatch`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Gagal melakukan dispatch shipment."
        );
      }

      setSuccess(
        `Shipment ${manifest.shipment.shipment_code} berhasil di-dispatch.`
      );

      setTimeout(async () => {
        setSelectedRequest(null);
        setManifest(null);
        setSuccess("");

        await loadRequests(true);
        router.refresh();
      }, 900);
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
      setDispatching(false);
    }
  }

  const totalItems =
    manifest?.items?.reduce(
      (total, item) =>
        total + Number(item.quantity || 0),
      0
    ) ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
            <Truck className="h-4 w-4" />
            Gudang / Dispatch
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Dispatch Center
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Proses keberangkatan shipment dari gudang
            sebelum barang masuk ke jalur distribusi.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadRequests(true)}
          disabled={refreshing}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              refreshing ? "animate-spin" : ""
            }`}
          />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && !selectedRequest && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

          <div>{error}</div>
        </div>
      )}

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Siap Dispatch"
          value={readyShipments.length}
          icon={
            <PackageCheck className="h-5 w-5" />
          }
          description="Menunggu keberangkatan"
        />

        <SummaryCard
          label="Dalam Perjalanan"
          value={inTransitCount}
          icon={<Truck className="h-5 w-5" />}
          description="Sudah keluar dari gudang"
        />

        <SummaryCard
          label="Total Shipment"
          value={totalShipmentCount}
          icon={<Package className="h-5 w-5" />}
          description="Shipment yang terbentuk"
        />
      </div>

      {/* Dispatch Queue */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-slate-900">
                Dispatch Queue
              </h2>

              <p className="mt-0.5 text-sm text-slate-500">
                Shipment READY yang dapat diberangkatkan.
              </p>
            </div>

            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {readyShipments.length} shipment
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Memuat dispatch queue...
            </div>
          </div>
        ) : readyShipments.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <PackageCheck className="h-7 w-7 text-slate-400" />
            </div>

            <h3 className="font-semibold text-slate-900">
              Tidak ada shipment siap dispatch
            </h3>

            <p className="mt-1 max-w-md text-sm text-slate-500">
              Shipment akan muncul di sini setelah
              request disetujui dan shipment berhasil
              dibuat oleh gudang.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[850px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-3">
                      Shipment
                    </th>

                    <th className="px-6 py-3">
                      Request
                    </th>

                    <th className="px-6 py-3">
                      Tujuan
                    </th>

                    <th className="px-6 py-3">
                      Approved
                    </th>

                    <th className="px-6 py-3 text-right">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {readyShipments.map((request) => (
                    <tr
                      key={request.id}
                      className="transition hover:bg-slate-50/60"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">
                          {request.shipmentCode}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          ID #{request.shipmentId}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800">
                          {request.request_code}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          Request #{request.id}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <MapPin className="h-4 w-4 text-slate-400" />

                          {getDestination(request)}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Clock3 className="h-4 w-4 text-slate-400" />

                          {formatDate(
                            request.approved_at
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            openDispatch(request)
                          }
                          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          <Truck className="h-4 w-4" />

                          Proses Dispatch
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="divide-y divide-slate-100 lg:hidden">
              {readyShipments.map((request) => (
                <div
                  key={request.id}
                  className="p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold text-slate-900">
                        {request.shipmentCode}
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        {request.request_code}
                      </div>
                    </div>

                    <StatusBadge status="READY" />
                  </div>

                  <div className="mt-4 space-y-2.5">
                    <InfoRow
                      icon={
                        <MapPin className="h-4 w-4" />
                      }
                      label="Tujuan"
                      value={getDestination(request)}
                    />

                    <InfoRow
                      icon={
                        <Clock3 className="h-4 w-4" />
                      }
                      label="Approved"
                      value={formatDate(
                        request.approved_at
                      )}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      openDispatch(request)
                    }
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    <Truck className="h-4 w-4" />

                    Proses Dispatch
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Dispatch Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-6">
          <div className="max-h-[92vh] w-full overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-3xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
              <div>
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <Truck className="h-4 w-4" />

                  Dispatch Confirmation
                </div>

                <h2 className="text-lg font-bold text-slate-900">
                  {manifest?.shipment
                    ?.shipment_code ||
                    selectedRequest.shipmentCode}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Konfirmasi barang benar-benar keluar
                  dari gudang.
                </p>
              </div>

              <button
                type="button"
                onClick={closeDispatch}
                disabled={dispatching}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="max-h-[calc(92vh-90px)] overflow-y-auto px-5 py-5 sm:px-6">
              {loadingManifest ? (
                <div className="flex min-h-64 flex-col items-center justify-center">
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" />

                    Menyiapkan manifest shipment...
                  </div>

                  <p className="mt-2 text-xs text-slate-400">
                    Memeriksa dan menyiapkan rute
                    pengiriman.
                  </p>
                </div>
              ) : manifest ? (
                <div className="space-y-5">
                  {/* Route */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      <Route className="h-4 w-4" />

                      Rute Pengiriman
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-slate-400">
                          Dari
                        </div>

                        <div className="mt-1 truncate font-semibold text-slate-900">
                          {manifest.leg
                            ?.from_location_name ||
                            "Gudang"}
                        </div>
                      </div>

                      <ArrowRight className="h-5 w-5 shrink-0 text-slate-400" />

                      <div className="min-w-0 flex-1 text-right">
                        <div className="text-xs text-slate-400">
                          Tujuan
                        </div>

                        <div className="mt-1 truncate font-semibold text-slate-900">
                          {manifest.leg
                            ?.to_location_name ||
                            getDestination(
                              selectedRequest
                            )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 text-xs text-slate-500">
                      <span>
                        Leg #{manifest.leg.sequence_no}
                      </span>

                      <span className="font-semibold text-slate-700">
                        {manifest.leg.status}
                      </span>
                    </div>
                  </div>

                  {/* Shipment Info */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoBox
                      label="Request"
                      value={
                        selectedRequest.request_code
                      }
                    />

                    <InfoBox
                      label="Shipment ID"
                      value={`#${manifest.shipment.id}`}
                    />

                    <InfoBox
                      label="Status"
                      value={manifest.shipment.status}
                    />

                    <InfoBox
                      label="Total Qty"
                      value={`${totalItems} unit`}
                    />
                  </div>

                  {/* Manifest Items */}
                  <div className="rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          Manifest Barang
                        </h3>

                        <p className="text-xs text-slate-500">
                          Barang yang akan diberangkatkan
                        </p>
                      </div>

                      <Package className="h-5 w-5 text-slate-400" />
                    </div>

                    <div className="divide-y divide-slate-100">
                      {manifest.items.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-slate-500">
                          Tidak ada item dalam manifest.
                        </div>
                      ) : (
                        manifest.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-4 px-4 py-3"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-slate-900">
                                {item.item_name ||
                                  item.item_code ||
                                  "Item bantuan"}
                              </div>

                              {item.item_code && (
                                <div className="mt-0.5 text-xs text-slate-500">
                                  {item.item_code}
                                </div>
                              )}
                            </div>

                            <div className="shrink-0 text-right">
                              <div className="font-semibold text-slate-900">
                                {item.quantity}
                              </div>

                              <div className="text-xs text-slate-400">
                                {item.unit || "unit"}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* QR */}
                  {manifest.qr && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                          <PackageCheck className="h-5 w-5 text-slate-600" />
                        </div>

                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900">
                            QR Manifest Aktif
                          </div>

                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            QR tersedia untuk custody
                            scan setelah shipment
                            diberangkatkan.
                          </p>

                          <div className="mt-2 truncate font-mono text-[11px] text-slate-400">
                            {manifest.qr.public_token}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Warning */}
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

                      <div>
                        <div className="text-sm font-semibold text-amber-900">
                          Pastikan barang benar-benar
                          keluar gudang
                        </div>

                        <p className="mt-1 text-xs leading-5 text-amber-800">
                          Setelah dispatch dikonfirmasi,
                          shipment berubah menjadi{" "}
                          <strong>IN_TRANSIT</strong> dan
                          scan berikutnya dapat dilakukan
                          di titik distribusi.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Success */}
                  {success && (
                    <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

                      <div className="font-medium">
                        {success}
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {error && (
                    <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

                      <div>{error}</div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={closeDispatch}
                      disabled={dispatching}
                      className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      Batal
                    </button>

                    <button
                      type="button"
                      onClick={handleDispatch}
                      disabled={
                        dispatching ||
                        manifest.shipment.status !==
                          "READY"
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {dispatching ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Memproses...
                        </>
                      ) : (
                        <>
                          <Truck className="h-4 w-4" />
                          Konfirmasi Dispatch
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-64 items-center justify-center text-sm text-slate-500">
                  Manifest tidak tersedia.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  description,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-medium text-slate-500">
            {label}
          </div>

          <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </div>

          <div className="mt-1 text-xs text-slate-400">
            {description}
          </div>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  return (
    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
      {status}
    </span>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-slate-400">
        {icon}
      </span>

      <div className="min-w-0">
        <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
          {label}
        </div>

        <div className="truncate text-sm font-medium text-slate-700">
          {value}
        </div>
      </div>
    </div>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="mt-1 text-sm font-semibold text-slate-900">
        {value}
      </div>
    </div>
  );
}
