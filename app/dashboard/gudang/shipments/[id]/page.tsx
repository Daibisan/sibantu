"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Box,
  CheckCircle2,
  Clock3,
  FileText,
  MapPin,
  Package,
  QrCode,
  Route,
  ScanLine,
  Truck,
  User,
  Warehouse,
  XCircle,
} from "lucide-react";

/* ============================================================
   TYPES
   ============================================================ */

type ShipmentStatus =
  | "PREPARING"
  | "READY"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED";

type ScanType =
  | "DEPARTURE"
  | "CHECKPOINT"
  | "ARRIVAL";

type Scan = {
  id: string | number;
  client_event_id: string;

  shipment_qr_id: string | number;
  shipment_leg_id: string | number;

  scanned_by: string | number;
  scanned_by_name: string;

  scanned_at_location_id: string | number;
  scanned_at_location_name: string;
  scanned_at_location_type: string;

  result: string;
  rejection_reason: string | null;

  device_scanned_at: string;
  server_received_at: string;

  validation_id: string | number | null;
  validation_status: string | null;
  validation_reason: string | null;
  validated_at: string | null;

  sequence_no: number;

  from_event_location_id: string | number;
  from_location_name: string;

  to_event_location_id: string | number;
  to_location_name: string;

  scan_type: ScanType;
};

type Leg = {
  id: string | number;
  shipment_id: string | number;
  sequence_no: number;

  from_event_location_id: string | number;
  from_location_name: string;

  to_event_location_id: string | number;
  to_location_name: string;

  status:
    | "PENDING"
    | "IN_TRANSIT"
    | "ARRIVED"
    | "CANCELLED";

  dispatched_at: string | null;
  arrived_at: string | null;
};

type Shipment = {
  id: string | number;
  shipment_code: string;
  request_id: string | number;
  status: ShipmentStatus;

  created_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
};

type RequestItem = {
  id: string | number;
  aid_item_id: string | number;
  item_code?: string;
  item_name?: string;
  name?: string;
  unit?: string;
  quantity?: number | string;
  approved_qty?: number | string;
  requested_qty?: number | string;
};

type AidRequest = {
  id: string | number;
  request_code: string;

  disaster_event_id: string | number;
  event_code?: string;
  event_name?: string;

  requester_location_id: string | number;
  requester_location_name?: string;

  submitted_by?: string | number;
  submitted_by_name?: string;

  status: string;
  reason?: string;

  requested_at?: string | null;
  approved_at?: string | null;

  shipment_id?: string | number | null;
  shipment_code?: string | null;
  shipment_status?: ShipmentStatus | null;

  shipment?: Shipment | null;

  items?: RequestItem[];
};

type ShipmentDetailResponse = {
  success: boolean;
  request?: AidRequest;
  shipment?: Shipment;
  items?: RequestItem[];
  message?: string;
};

/* ============================================================
   HELPERS
   ============================================================ */

function normalizeId(
  value: string | number | null | undefined
) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDateShort(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function statusLabel(status?: string | null) {
  switch (status) {
    case "PREPARING":
      return "Persiapan";

    case "READY":
      return "Siap Dispatch";

    case "IN_TRANSIT":
      return "Dalam Perjalanan";

    case "DELIVERED":
      return "Terkirim";

    case "CANCELLED":
      return "Dibatalkan";

    case "PENDING":
      return "Menunggu";

    case "ARRIVED":
      return "Tiba";

    default:
      return status || "-";
  }
}

function statusClass(status?: string | null) {
  switch (status) {
    case "READY":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "IN_TRANSIT":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "DELIVERED":
    case "ARRIVED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "CANCELLED":
      return "bg-red-50 text-red-700 border-red-200";

    case "PREPARING":
    case "PENDING":
      return "bg-slate-100 text-slate-600 border-slate-200";

    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function scanTypeLabel(type?: ScanType) {
  switch (type) {
    case "DEPARTURE":
      return "Keberangkatan";

    case "CHECKPOINT":
      return "Checkpoint";

    case "ARRIVAL":
      return "Kedatangan";

    default:
      return "-";
  }
}

function scanTypeClass(type?: ScanType) {
  switch (type) {
    case "DEPARTURE":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "CHECKPOINT":
      return "bg-violet-50 text-violet-700 border-violet-200";

    case "ARRIVAL":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function itemQuantity(item: RequestItem) {
  const value =
    item.approved_qty ??
    item.quantity ??
    item.requested_qty ??
    0;

  return Number(value);
}

/* ============================================================
   STATUS PROGRESS
   ============================================================ */

const progressSteps = [
  {
    key: "READY",
    label: "Siap",
    description: "Shipment siap dikirim",
  },
  {
    key: "DEPARTURE",
    label: "Berangkat",
    description: "Barang keluar dari gudang",
  },
  {
    key: "IN_TRANSIT",
    label: "Perjalanan",
    description: "Shipment dalam perjalanan",
  },
  {
    key: "ARRIVAL",
    label: "Tiba",
    description: "Shipment tiba di tujuan",
  },
  {
    key: "DELIVERED",
    label: "Diterima",
    description: "Penerimaan dikonfirmasi",
  },
];

/* ============================================================
   COMPONENT
   ============================================================ */

export default function ShipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [shipmentId, setShipmentId] =
    useState<string>("");

  const [request, setRequest] =
    useState<AidRequest | null>(null);

  const [shipment, setShipment] =
    useState<Shipment | null>(null);

  const [items, setItems] =
    useState<RequestItem[]>([]);

  const [legs, setLegs] =
    useState<Leg[]>([]);

  const [scans, setScans] =
    useState<Scan[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /* ==========================================================
     LOAD PARAM
     ========================================================== */

  useEffect(() => {
    async function loadParams() {
      const resolvedParams = await params;

      setShipmentId(
        normalizeId(resolvedParams.id)
      );
    }

    loadParams();
  }, [params]);

  /* ==========================================================
     LOAD DATA
     ========================================================== */

  useEffect(() => {
    if (!shipmentId) return;

    loadShipment();
  }, [shipmentId]);

  async function loadShipment() {
    try {
      setLoading(true);
      setError("");

      /* ========================================================
         1. GET REQUEST LIST
         ======================================================== */

      const requestsResponse = await fetch(
        "/api/aid-requests",
        {
          cache: "no-store",
        }
      );

      const requestsData =
        await requestsResponse.json();

      if (!requestsResponse.ok) {
        throw new Error(
          requestsData?.message ||
            "Gagal mengambil daftar request."
        );
      }

      const requestList: AidRequest[] =
        Array.isArray(requestsData?.requests)
          ? requestsData.requests
          : [];

      /* ========================================================
         2. FIND REQUEST BY SHIPMENT ID
         ======================================================== */

      let matchedRequest =
        requestList.find((item) => {
          const itemShipmentId =
            item.shipment_id ??
            item.shipment?.id;

          return (
            normalizeId(itemShipmentId) ===
            normalizeId(shipmentId)
          );
        });

      if (!matchedRequest) {
        // Fallback: fetch directly from /api/shipments/[id]
        const directShipmentRes = await fetch(`/api/shipments/${shipmentId}`, {
          cache: "no-store",
        });

        if (directShipmentRes.ok) {
          const directData = await directShipmentRes.json();
          if (directData.success && directData.shipment?.request_id) {
            matchedRequest = {
              id: directData.shipment.request_id,
              request_code: directData.shipment.request_code,
              shipment_id: directData.shipment.id,
              shipment_code: directData.shipment.shipment_code,
              shipment_status: directData.shipment.status,
              disaster_event_id: directData.shipment.event?.id,
              event_name: directData.shipment.event?.name,
              requester_location_name: directData.shipment.destination?.name,
            } as any;
          }
        }
      }

      if (!matchedRequest) {
        throw new Error(
          "Request untuk shipment ini tidak ditemukan."
        );
      }

      /* ========================================================
         3. GET REQUEST DETAIL
         ======================================================== */

      const detailResponse =
        await fetch(
          `/api/aid-requests/${matchedRequest.id}`,
          {
            cache: "no-store",
          }
        );

      const detailData: ShipmentDetailResponse =
        await detailResponse.json();

      if (!detailResponse.ok) {
        throw new Error(
          detailData?.message ||
            "Gagal mengambil detail request."
        );
      }

      /* ========================================================
         4. MERGE REQUEST + SHIPMENT
         ======================================================== */

      /*
       * Jangan mengganti matchedRequest secara langsung.
       *
       * Data shipment sudah ditemukan dari
       * /api/aid-requests.
       *
       * Endpoint /api/aid-requests/[id] mungkin tidak
       * mengembalikan shipment_id / shipment_code /
       * shipment_status.
       *
       * Karena itu data keduanya digabung.
       */

      const detailRequest: AidRequest = {
        ...matchedRequest,
        ...(detailData.request || {}),

        shipment_id:
          detailData.request?.shipment_id ??
          matchedRequest.shipment_id ??
          null,

        shipment_code:
          detailData.request?.shipment_code ??
          matchedRequest.shipment_code ??
          null,

        shipment_status:
          detailData.request?.shipment_status ??
          matchedRequest.shipment_status ??
          null,

        shipment:
          detailData.request?.shipment ??
          matchedRequest.shipment ??
          null,
      };

      setRequest(detailRequest);

      /* ========================================================
         5. NORMALIZE SHIPMENT
         ======================================================== */

      let normalizedShipment:
        | Shipment
        | null =
        detailData.shipment ??
        detailRequest.shipment ??
        null;

      /*
       * Fallback:
       *
       * Jika endpoint detail request tidak mengembalikan
       * object shipment, gunakan shipment_id yang sudah
       * ditemukan dari request list.
       */

      if (
        !normalizedShipment &&
        detailRequest.shipment_id
      ) {
        normalizedShipment = {
          id: detailRequest.shipment_id,

          shipment_code:
            detailRequest.shipment_code ||
            `SHP-${detailRequest.shipment_id}`,

          request_id: detailRequest.id,

          status:
            detailRequest.shipment_status ||
            "PREPARING",

          created_at: null,
          dispatched_at: null,
          delivered_at: null,
        };
      }

      if (!normalizedShipment) {
        throw new Error(
          "Data shipment tidak ditemukan."
        );
      }

      /*
       * Pastikan ID shipment yang digunakan
       * adalah ID dari shipment yang sedang dibuka.
       */

      if (
        normalizeId(normalizedShipment.id) !==
        normalizeId(shipmentId)
      ) {
        throw new Error(
          "ID shipment tidak sesuai dengan data request."
        );
      }

      setShipment(normalizedShipment);

      /* ========================================================
         6. ITEMS
         ======================================================== */

      setItems(
        Array.isArray(detailData.items)
          ? detailData.items
          : Array.isArray(
              detailRequest.items
            )
          ? detailRequest.items
          : []
      );

      /* ========================================================
         7. GET LEGS
         ======================================================== */

      const legsResponse =
        await fetch(
          `/api/shipments/${shipmentId}/legs`,
          {
            cache: "no-store",
          }
        );

      if (legsResponse.ok) {
        const legsData =
          await legsResponse.json();

        setLegs(
          Array.isArray(legsData?.legs)
            ? legsData.legs
            : []
        );
      } else {
        setLegs([]);
      }

      /* ========================================================
         8. GET SCAN HISTORY
         ======================================================== */

      const scansResponse =
        await fetch(
          `/api/shipments/${shipmentId}/scan`,
          {
            cache: "no-store",
          }
        );

      if (scansResponse.ok) {
        const scansData =
          await scansResponse.json();

        setScans(
          Array.isArray(scansData?.scans)
            ? scansData.scans
            : []
        );
      } else {
        setScans([]);
      }
    } catch (err) {
      console.error(
        "Load shipment detail error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengambil detail shipment."
      );
    } finally {
      setLoading(false);
    }
  }

  /* ============================================================
     DERIVED DATA
     ============================================================ */

  const sortedLegs = useMemo(() => {
    return [...legs].sort(
      (a, b) =>
        Number(a.sequence_no) -
        Number(b.sequence_no)
    );
  }, [legs]);

  const sortedScans = useMemo(() => {
    return [...scans].sort((a, b) => {
      const dateA =
        new Date(
          a.server_received_at
        ).getTime();

      const dateB =
        new Date(
          b.server_received_at
        ).getTime();

      if (dateA !== dateB) {
        return dateA - dateB;
      }

      return (
        Number(a.id) -
        Number(b.id)
      );
    });
  }, [scans]);

  const firstLeg =
    sortedLegs[0] || null;

  const lastLeg =
    sortedLegs[
      sortedLegs.length - 1
    ] || null;

  const departureScan =
    sortedScans.find(
      (scan) =>
        scan.scan_type ===
        "DEPARTURE"
    ) || null;

  const arrivalScan =
    [...sortedScans]
      .reverse()
      .find(
        (scan) =>
          scan.scan_type ===
          "ARRIVAL"
      ) || null;

  const checkpointScans =
    sortedScans.filter(
      (scan) =>
        scan.scan_type ===
        "CHECKPOINT"
    );

  const totalItems = items.length;

  const totalQuantity = items.reduce(
    (total, item) =>
      total + itemQuantity(item),
    0
  );

  /* ============================================================
     PROGRESS
     ============================================================ */

  const progressIndex = useMemo(() => {
    if (!shipment) return 0;

    if (
      shipment.status ===
      "DELIVERED"
    ) {
      return 4;
    }

    if (arrivalScan) {
      return 3;
    }

    if (
      shipment.status ===
      "IN_TRANSIT"
    ) {
      return 2;
    }

    if (departureScan) {
      return 1;
    }

    if (
      shipment.status ===
        "READY" ||
      shipment.status ===
        "PREPARING"
    ) {
      return 0;
    }

    return 0;
  }, [
    shipment,
    departureScan,
    arrivalScan,
  ]);

  /* ============================================================
     NEXT ACTION
     ============================================================ */

  const nextAction = useMemo(() => {
    if (!shipment) return null;

    if (
      shipment.status ===
      "CANCELLED"
    ) {
      return {
        title: "Shipment Dibatalkan",
        description:
          "Shipment ini sudah dibatalkan dan tidak dapat dilanjutkan.",
        type: "NONE",
      };
    }

    if (
      shipment.status ===
      "DELIVERED"
    ) {
      return {
        title: "Shipment Selesai",
        description:
          "Barang sudah diterima dan proses distribusi selesai.",
        type: "NONE",
      };
    }

    if (
      shipment.status ===
      "READY"
    ) {
      return {
        title: "Dispatch Shipment",
        description:
          "Shipment sudah siap. Lakukan dispatch untuk mencatat keberangkatan dari gudang.",
        type: "DISPATCH",
      };
    }

    if (
      shipment.status ===
        "IN_TRANSIT" &&
      !arrivalScan
    ) {
      return {
        title: "Menunggu Kedatangan",
        description:
          "Shipment sedang dalam perjalanan. Scan QR di lokasi tujuan ketika barang tiba.",
        type: "ARRIVAL",
      };
    }

    if (
      shipment.status ===
        "IN_TRANSIT" &&
      arrivalScan
    ) {
      return {
        title: "Menunggu Penerimaan",
        description:
          "Barang sudah tiba. Petugas posko perlu melakukan verifikasi dan receipt.",
        type: "RECEIPT",
      };
    }

    return null;
  }, [
    shipment,
    arrivalScan,
  ]);

  /* ============================================================
     LOADING
     ============================================================ */

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-200" />

        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-28 animate-pulse rounded-2xl bg-white" />
          <div className="h-28 animate-pulse rounded-2xl bg-white" />
          <div className="h-28 animate-pulse rounded-2xl bg-white" />
        </div>

        <div className="h-96 animate-pulse rounded-2xl bg-white" />
      </div>
    );
  }

  /* ============================================================
     ERROR
     ============================================================ */

  if (error || !shipment) {
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard/gudang/shipments"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Shipment
        </Link>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 h-5 w-5 text-red-600" />

            <div>
              <h2 className="font-semibold text-red-900">
                Gagal memuat shipment
              </h2>

              <p className="mt-1 text-sm text-red-700">
                {error ||
                  "Shipment tidak ditemukan."}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ============================================================
     MAIN
     ============================================================ */

  return (
    <div className="space-y-6 pb-10">
      {/* ======================================================
          HEADER
          ====================================================== */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/dashboard/gudang/shipments"
            className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {shipment.shipment_code}
              </h1>

              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                  shipment.status
                )}`}
              >
                {statusLabel(
                  shipment.status
                )}
              </span>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Detail distribusi dan custody
              shipment
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/dashboard/gudang/shipments/${shipmentId}/qr`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <QrCode className="h-4 w-4" />
            QR Manifest
          </Link>

          {shipment.status ===
            "IN_TRANSIT" && (
            <Link
              href="/dashboard/posko/scan"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <ScanLine className="h-4 w-4" />
              Scan Penerimaan
            </Link>
          )}

          {shipment.status ===
            "READY" && (
            <Link
              href="/dashboard/gudang/dispatch"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Truck className="h-4 w-4" />
              Dispatch
            </Link>
          )}
        </div>
      </div>

      {/* ======================================================
          SUMMARY CARDS
          ====================================================== */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={
            <Package className="h-5 w-5" />
          }
          label="Total Item"
          value={String(totalItems)}
          description="Jenis bantuan"
        />

        <SummaryCard
          icon={
            <Box className="h-5 w-5" />
          }
          label="Total Kuantitas"
          value={String(totalQuantity)}
          description="Unit bantuan"
        />

        <SummaryCard
          icon={
            <Route className="h-5 w-5" />
          }
          label="Route Leg"
          value={String(
            sortedLegs.length
          )}
          description="Tahap perjalanan"
        />

        <SummaryCard
          icon={
            <ScanLine className="h-5 w-5" />
          }
          label="Scan Tercatat"
          value={String(
            sortedScans.length
          )}
          description="Custody events"
        />
      </div>

      {/* ======================================================
          ROUTE
          ====================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <SectionHeader
          icon={
            <Route className="h-5 w-5" />
          }
          title="Rute Distribusi"
          description="Alur perpindahan shipment"
        />

        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <div className="flex flex-col gap-5 md:flex-row md:items-center">
            <RoutePoint
              icon={
                <Warehouse className="h-5 w-5" />
              }
              label="Asal"
              name={
                firstLeg
                  ?.from_location_name ||
                "Gudang Utama BPBD"
              }
              type="Gudang"
            />

            <div className="hidden flex-1 items-center md:flex">
              <div className="h-px flex-1 bg-slate-300" />

              <div className="mx-3 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500">
                <ArrowRight className="h-4 w-4" />
              </div>

              <div className="h-px flex-1 bg-slate-300" />
            </div>

            <div className="flex justify-center md:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500">
                <ArrowRight className="h-4 w-4 rotate-90" />
              </div>
            </div>

            <RoutePoint
              icon={
                <MapPin className="h-5 w-5" />
              }
              label="Tujuan"
              name={
                lastLeg
                  ?.to_location_name ||
                request
                  ?.requester_location_name ||
                "-"
              }
              type="Posko"
            />
          </div>
        </div>
      </section>

      {/* ======================================================
          PROGRESS
          ====================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <SectionHeader
          icon={
            <Clock3 className="h-5 w-5" />
          }
          title="Progress Shipment"
          description="Status berdasarkan event custody"
        />

        <div className="mt-6">
          <div className="grid grid-cols-5">
            {progressSteps.map(
              (step, index) => {
                const active =
                  index <= progressIndex;

                const current =
                  index ===
                  progressIndex;

                return (
                  <div
                    key={step.key}
                    className="relative"
                  >
                    {index <
                      progressSteps.length -
                        1 && (
                      <div
                        className={`absolute left-1/2 right-0 top-4 h-0.5 ${
                          index <
                          progressIndex
                            ? "bg-slate-900"
                            : "bg-slate-200"
                        }`}
                      />
                    )}

                    <div className="relative flex flex-col items-center text-center">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                          active
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white text-slate-400"
                        }`}
                      >
                        {active ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-current" />
                        )}
                      </div>

                      <p
                        className={`mt-2 text-xs font-semibold ${
                          current
                            ? "text-slate-900"
                            : active
                            ? "text-slate-700"
                            : "text-slate-400"
                        }`}
                      >
                        {step.label}
                      </p>

                      <p className="mt-0.5 hidden max-w-24 text-[11px] leading-4 text-slate-400 sm:block">
                        {
                          step.description
                        }
                      </p>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      </section>

      {/* ======================================================
          NEXT ACTION
          ====================================================== */}

      {nextAction &&
        nextAction.type !==
          "NONE" && (
          <section className="rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Next Action
                </p>

                <h2 className="mt-1 text-lg font-bold">
                  {nextAction.title}
                </h2>

                <p className="mt-1 max-w-2xl text-sm text-slate-300">
                  {
                    nextAction.description
                  }
                </p>
              </div>

              {nextAction.type ===
                "DISPATCH" && (
                <Link
                  href="/dashboard/gudang/dispatch"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  <Truck className="h-4 w-4" />
                  Buka Dispatch Center
                </Link>
              )}

              {nextAction.type ===
                "ARRIVAL" && (
                <Link
                  href="/dashboard/posko/scan"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  <ScanLine className="h-4 w-4" />
                  Buka Scanner
                </Link>
              )}

              {nextAction.type ===
                "RECEIPT" && (
                <Link
                  href="/dashboard/posko/scan"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Proses Penerimaan
                </Link>
              )}
            </div>
          </section>
        )}

      {/* ======================================================
          TWO COLUMN
          ====================================================== */}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {/* ====================================================
            SCAN TIMELINE
            ==================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <SectionHeader
            icon={
              <ScanLine className="h-5 w-5" />
            }
            title="Custody Timeline"
            description={`${sortedScans.length} event scan tercatat`}
          />

          {sortedScans.length ===
          0 ? (
            <EmptyState
              icon={
                <ScanLine className="h-5 w-5" />
              }
              title="Belum ada scan"
              description="Belum ada aktivitas custody yang tercatat untuk shipment ini."
            />
          ) : (
            <div className="mt-6">
              {sortedScans.map(
                (scan, index) => (
                  <ScanTimelineItem
                    key={scan.id}
                    scan={scan}
                    isLast={
                      index ===
                      sortedScans.length -
                        1
                    }
                  />
                )
              )}
            </div>
          )}
        </section>

        {/* ====================================================
            ROUTE LEGS
            ==================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <SectionHeader
            icon={
              <Route className="h-5 w-5" />
            }
            title="Route Legs"
            description="Tahapan perjalanan shipment"
          />

          {sortedLegs.length ===
          0 ? (
            <EmptyState
              icon={
                <Route className="h-5 w-5" />
              }
              title="Belum ada route"
              description="Shipment belum memiliki route leg."
            />
          ) : (
            <div className="mt-5 space-y-3">
              {sortedLegs.map(
                (leg) => (
                  <LegCard
                    key={leg.id}
                    leg={leg}
                  />
                )
              )}
            </div>
          )}
        </section>
      </div>

      {/* ======================================================
          MANIFEST
          ====================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <SectionHeader
          icon={
            <Package className="h-5 w-5" />
          }
          title="Manifest Bantuan"
          description="Daftar barang yang dibawa shipment"
        />

        {items.length === 0 ? (
          <EmptyState
            icon={
              <Package className="h-5 w-5" />
            }
            title="Manifest kosong"
            description="Tidak ada item bantuan pada shipment ini."
          />
        ) : (
          <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-[1fr_auto] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>Item Bantuan</span>
              <span>Jumlah</span>
            </div>

            <div className="divide-y divide-slate-100">
              {items.map(
                (item, index) => {
                  const name =
                    item.item_name ||
                    item.name ||
                    `Item ${index + 1}`;

                  const quantity =
                    itemQuantity(item);

                  return (
                    <div
                      key={normalizeId(
                        item.id
                      )}
                      className="grid grid-cols-[1fr_auto] items-center px-4 py-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                          <Package className="h-4 w-4" />
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {name}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            {item.item_code ||
                              "-"}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">
                          {quantity}
                        </p>

                        <p className="text-xs text-slate-400">
                          {item.unit ||
                            "unit"}
                        </p>
                      </div>
                    </div>
                  );
                }
              )}
            </div>

            <div className="grid grid-cols-[1fr_auto] border-t border-slate-200 bg-slate-50 px-4 py-3">
              <span className="text-sm font-semibold text-slate-700">
                Total
              </span>

              <span className="text-sm font-bold text-slate-900">
                {totalQuantity} unit
              </span>
            </div>
          </div>
        )}
      </section>

      {/* ======================================================
          REQUEST INFORMATION
          ====================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <SectionHeader
          icon={
            <FileText className="h-5 w-5" />
          }
          title="Informasi Request"
          description="Sumber permintaan shipment"
        />

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoItem
            icon={
              <FileText className="h-4 w-4" />
            }
            label="Request"
            value={
              request?.request_code ||
              `#${request?.id || "-"}`
            }
          />

          <InfoItem
            icon={
              <MapPin className="h-4 w-4" />
            }
            label="Lokasi Pemohon"
            value={
              request
                ?.requester_location_name ||
              "-"
            }
          />

          <InfoItem
            icon={
              <User className="h-4 w-4" />
            }
            label="Diajukan Oleh"
            value={
              request
                ?.submitted_by_name ||
              "-"
            }
          />

          <InfoItem
            icon={
              <Clock3 className="h-4 w-4" />
            }
            label="Tanggal Request"
            value={formatDateShort(
              request?.requested_at
            )}
          />
        </div>

        {request?.reason && (
          <div className="mt-5 rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Alasan Permintaan
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-700">
              {request.reason}
            </p>
          </div>
        )}
      </section>

      {/* ======================================================
          SHIPMENT METADATA
          ====================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <SectionHeader
          icon={
            <Truck className="h-5 w-5" />
          }
          title="Metadata Shipment"
          description="Informasi waktu dan status"
        />

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoItem
            icon={
              <Clock3 className="h-4 w-4" />
            }
            label="Dibuat"
            value={formatDate(
              shipment.created_at
            )}
          />

          <InfoItem
            icon={
              <Truck className="h-4 w-4" />
            }
            label="Dispatch"
            value={formatDate(
              shipment.dispatched_at
            )}
          />

          <InfoItem
            icon={
              <MapPin className="h-4 w-4" />
            }
            label="Arrival"
            value={formatDate(
              arrivalScan?.server_received_at
            )}
          />

          <InfoItem
            icon={
              <CheckCircle2 className="h-4 w-4" />
            }
            label="Delivered"
            value={formatDate(
              shipment.delivered_at
            )}
          />
        </div>
      </section>

      {/* ======================================================
          SCAN SUMMARY
          ====================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <SectionHeader
          icon={
            <ScanLine className="h-5 w-5" />
          }
          title="Ringkasan Custody"
          description="Status event scan shipment"
        />

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <CustodySummary
            label="Departure"
            value={
              departureScan
                ? "Tercatat"
                : "Belum"
            }
            active={
              Boolean(departureScan)
            }
          />

          <CustodySummary
            label="Checkpoint"
            value={`${checkpointScans.length} scan`}
            active={
              checkpointScans.length >
              0
            }
          />

          <CustodySummary
            label="Arrival"
            value={
              arrivalScan
                ? "Tercatat"
                : "Belum"
            }
            active={
              Boolean(arrivalScan)
            }
          />
        </div>
      </section>
    </div>
  );
}

/* ============================================================
   SUMMARY CARD
   ============================================================ */

function SummaryCard({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          {icon}
        </div>

        <span className="text-xs font-medium text-slate-400">
          {description}
        </span>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </p>

        <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          {value}
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   SECTION HEADER
   ============================================================ */

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
        {icon}
      </div>

      <div>
        <h2 className="text-base font-bold text-slate-900">
          {title}
        </h2>

        <p className="mt-0.5 text-xs text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   ROUTE POINT
   ============================================================ */

function RoutePoint({
  icon,
  label,
  name,
  type,
}: {
  icon: React.ReactNode;
  label: string;
  name: string;
  type: string;
}) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <div className="mt-2 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm ring-1 ring-slate-200">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">
            {name}
          </p>

          <p className="mt-0.5 text-xs text-slate-400">
            {type}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SCAN TIMELINE
   ============================================================ */

function ScanTimelineItem({
  scan,
  isLast,
}: {
  scan: Scan;
  isLast: boolean;
}) {
  const isValid =
    scan.result === "VALID" &&
    scan.validation_status ===
      "VALID";

  return (
    <div className="relative flex gap-4">
      {!isLast && (
        <div className="absolute bottom-0 left-[15px] top-8 w-px bg-slate-200" />
      )}

      <div
        className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
          isValid
            ? "border-emerald-200 bg-emerald-50 text-emerald-600"
            : "border-red-200 bg-red-50 text-red-600"
        }`}
      >
        {isValid ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <XCircle className="h-4 w-4" />
        )}
      </div>

      <div
        className={`min-w-0 flex-1 ${
          isLast ? "pb-0" : "pb-7"
        }`}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${scanTypeClass(
                  scan.scan_type
                )}`}
              >
                {scanTypeLabel(
                  scan.scan_type
                )}
              </span>

              {isValid && (
                <span className="text-[11px] font-medium text-emerald-600">
                  VALID
                </span>
              )}
            </div>

            <h3 className="mt-2 text-sm font-bold text-slate-900">
              {scan.scanned_at_location_name}
            </h3>
          </div>

          <span className="shrink-0 text-xs text-slate-400">
            {formatDate(
              scan.server_received_at
            )}
          </span>
        </div>

        <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <TimelineInfo
              label="Petugas"
              value={
                scan.scanned_by_name ||
                "-"
              }
              icon={
                <User className="h-3.5 w-3.5" />
              }
            />

            <TimelineInfo
              label="Lokasi"
              value={
                scan.scanned_at_location_name
              }
              icon={
                <MapPin className="h-3.5 w-3.5" />
              }
            />

            <TimelineInfo
              label="Route"
              value={`${scan.from_location_name} → ${scan.to_location_name}`}
              icon={
                <Route className="h-3.5 w-3.5" />
              }
            />

            <TimelineInfo
              label="Leg"
              value={`Leg ${scan.sequence_no}`}
              icon={
                <Truck className="h-3.5 w-3.5" />
              }
            />
          </div>

          {scan.validation_reason && (
            <div className="mt-3 border-t border-slate-200 pt-3">
              <p className="text-xs text-slate-500">
                {scan.validation_reason}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   TIMELINE INFO
   ============================================================ */

function TimelineInfo({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 gap-2">
      <div className="mt-0.5 shrink-0 text-slate-400">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </p>

        <p className="mt-0.5 truncate text-xs font-medium text-slate-700">
          {value}
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   LEG CARD
   ============================================================ */

function LegCard({
  leg,
}: {
  leg: Leg;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
            {leg.sequence_no}
          </span>

          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Leg
          </span>
        </div>

        <span
          className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${statusClass(
            leg.status
          )}`}
        >
          {statusLabel(leg.status)}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <MiniRoutePoint
          label="Dari"
          name={leg.from_location_name}
          icon={
            <Warehouse className="h-4 w-4" />
          }
        />

        <div className="ml-2 h-4 border-l border-dashed border-slate-300" />

        <MiniRoutePoint
          label="Ke"
          name={leg.to_location_name}
          icon={
            <MapPin className="h-4 w-4" />
          }
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Berangkat
          </p>

          <p className="mt-1 text-xs font-medium text-slate-700">
            {formatDate(
              leg.dispatched_at
            )}
          </p>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Tiba
          </p>

          <p className="mt-1 text-xs font-medium text-slate-700">
            {formatDate(
              leg.arrived_at
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MINI ROUTE POINT
   ============================================================ */

function MiniRoutePoint({
  label,
  name,
  icon,
}: {
  label: string;
  name: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </p>

        <p className="mt-0.5 text-xs font-semibold text-slate-800">
          {name}
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   INFO ITEM
   ============================================================ */

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}

        <span className="text-[10px] font-semibold uppercase tracking-wider">
          {label}
        </span>
      </div>

      <p className="mt-2 truncate text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}

/* ============================================================
   EMPTY STATE
   ============================================================ */

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-400 ring-1 ring-slate-200">
        {icon}
      </div>

      <h3 className="mt-3 text-sm font-semibold text-slate-700">
        {title}
      </h3>

      <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-400">
        {description}
      </p>
    </div>
  );
}

/* ============================================================
   CUSTODY SUMMARY
   ============================================================ */

function CustodySummary({
  label,
  value,
  active,
}: {
  label: string;
  value: string;
  active: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        active
          ? "border-emerald-200 bg-emerald-50"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p
          className={`text-xs font-semibold ${
            active
              ? "text-emerald-700"
              : "text-slate-500"
          }`}
        >
          {label}
        </p>

        {active ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        ) : (
          <Clock3 className="h-4 w-4 text-slate-400" />
        )}
      </div>

      <p
        className={`mt-2 text-sm font-bold ${
          active
            ? "text-emerald-800"
            : "text-slate-700"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
