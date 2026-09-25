"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type RequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | string;

type ShipmentStatus =
  | "PREPARING"
  | "READY"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED"
  | string;

type AidRequest = {
  id: number | string;
  request_code: string;
  status: RequestStatus;
  reason?: string | null;
  requested_at?: string | null;
  approved_at?: string | null;

  event_name?: string | null;
  disaster_event_name?: string | null;

  location_name?: string | null;
  requester_location_name?: string | null;

  shipment_id?: number | string | null;
  shipment_code?: string | null;
  shipment_status?: ShipmentStatus | null;
  shipment_created_at?: string | null;
  shipment_dispatched_at?: string | null;
  shipment_delivered_at?: string | null;

  shipment?: {
    id: number | string;
    shipment_code: string;
    status: ShipmentStatus;
    created_at?: string | null;
    dispatched_at?: string | null;
    delivered_at?: string | null;
  } | null;
};

type User = {
  name: string;
  role: {
    code: string;
  };
};

export default function PoskoDashboardPage() {
  const [requests, setRequests] = useState<AidRequest[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const [meResponse, requestsResponse] = await Promise.all([
        fetch("/api/auth/me", {
          cache: "no-store",
        }),
        fetch("/api/aid-requests", {
          cache: "no-store",
        }),
      ]);

      if (!meResponse.ok) {
        window.location.href = "/login";
        return;
      }

      const meData = await meResponse.json();

      if (!meData?.user) {
        window.location.href = "/login";
        return;
      }

      if (meData.user.role?.code !== "PETUGAS_POSKO") {
        window.location.href = "/dashboard";
        return;
      }

      setUser(meData.user);

      if (!requestsResponse.ok) {
        throw new Error("Gagal mengambil data pengajuan.");
      }

      const requestsData = await requestsResponse.json();

      setRequests(
        Array.isArray(requestsData?.requests)
          ? requestsData.requests
          : [],
      );
    } catch (err) {
      console.error("Posko dashboard error:", err);
      setError("Gagal memuat dashboard.");
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const pending = requests.filter(
      (item) => item.status === "PENDING",
    ).length;

    const approved = requests.filter(
      (item) => item.status === "APPROVED",
    ).length;

    const rejected = requests.filter(
      (item) => item.status === "REJECTED",
    ).length;

    const shipments = requests.filter((item) => {
      const status = getShipmentStatus(item);

      return Boolean(
        getShipmentId(item) ||
          getShipmentCode(item) ||
          status,
      );
    });

    const inTransit = shipments.filter(
      (item) => getShipmentStatus(item) === "IN_TRANSIT",
    ).length;

    const waitingReceipt = shipments.filter(
      (item) => getShipmentStatus(item) === "IN_TRANSIT",
    ).length;

    const delivered = shipments.filter(
      (item) => getShipmentStatus(item) === "DELIVERED",
    ).length;

    return {
      total: requests.length,
      pending,
      approved,
      rejected,
      shipments: shipments.length,
      inTransit,
      waitingReceipt,
      delivered,
    };
  }, [requests]);

  const recentRequests = useMemo(() => {
    return [...requests]
      .sort(
        (a, b) =>
          new Date(b.requested_at ?? 0).getTime() -
          new Date(a.requested_at ?? 0).getTime(),
      )
      .slice(0, 5);
  }, [requests]);

  const activeEvent = useMemo(() => {
    const requestWithEvent = requests.find(
      (item) =>
        item.event_name ||
        item.disaster_event_name,
    );

    return (
      requestWithEvent?.event_name ??
      requestWithEvent?.disaster_event_name ??
      "Event aktif"
    );
  }, [requests]);

  if (loading) {
    return <LoadingState />;
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <section className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Posko Lapangan
              </p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Dashboard Posko
              </h1>

              <p className="mt-1 text-sm text-slate-600">
                Selamat datang, {user.name}. Pantau kebutuhan dan
                distribusi bantuan dari sini.
              </p>
            </div>

            <button
              onClick={loadDashboard}
              className="inline-flex w-fit items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              ↻ Refresh
            </button>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Event */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Event Bencana Aktif
              </p>

              <h2 className="mt-1 text-lg font-bold text-slate-900">
                {activeEvent}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Aktivitas posko dan distribusi bantuan terhubung
                dengan event ini.
              </p>
            </div>

            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              ACTIVE
            </span>
          </div>
        </section>

        {/* Stats */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Pengajuan"
            value={stats.total}
            description={`${stats.pending} masih menunggu verifikasi`}
            icon="▤"
          />

          <StatCard
            label="Pengajuan Disetujui"
            value={stats.approved}
            description={`${stats.delivered} shipment sudah diterima`}
            icon="✓"
          />

          <StatCard
            label="Shipment Berjalan"
            value={stats.inTransit}
            description="Menunggu proses penerimaan"
            icon="→"
          />

          <StatCard
            label="Menunggu Konfirmasi"
            value={stats.waitingReceipt}
            description="Perlu scan & penerimaan posko"
            icon="!"
          />
        </section>

        {/* Quick actions */}
        <section className="mt-6">
          <div className="mb-3">
            <h2 className="text-base font-bold text-slate-900">
              Aksi Cepat
            </h2>
            <p className="text-sm text-slate-500">
              Akses fungsi utama posko.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction
              href="/dashboard/posko/requests"
              icon="+"
              title="Ajukan Bantuan"
              description="Buat pengajuan kebutuhan baru"
            />

            <QuickAction
              href="/dashboard/posko/shipments"
              icon="→"
              title="Shipment"
              description="Pantau pengiriman bantuan"
            />

            <QuickAction
              href="/dashboard/posko/scan"
              icon="⌗"
              title="Scan Paket"
              description="Scan QR untuk verifikasi"
            />

            <QuickAction
              href="/dashboard/posko/location"
              icon="⌖"
              title="Lokasi Posko"
              description="Lihat informasi lokasi posko"
            />
          </div>
        </section>

        {/* Main content */}
        <section className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          {/* Recent requests */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-bold text-slate-900">
                  Pengajuan Terbaru
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Aktivitas pengajuan bantuan posko
                </p>
              </div>

              <Link
                href="/dashboard/posko/requests"
                className="text-sm font-semibold text-slate-700 hover:text-slate-900"
              >
                Lihat semua →
              </Link>
            </div>

            {recentRequests.length === 0 ? (
              <EmptyState
                title="Belum ada pengajuan"
                description="Pengajuan bantuan yang dibuat posko akan muncul di sini."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {recentRequests.map((request) => (
                  <RequestRow
                    key={String(request.id)}
                    request={request}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Operational summary */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-bold text-slate-900">
                Ringkasan Operasional
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Status aktivitas posko saat ini
              </p>
            </div>

            <div className="space-y-3 p-5">
              <SummaryRow
                label="Menunggu Verifikasi"
                value={stats.pending}
              />

              <SummaryRow
                label="Disetujui"
                value={stats.approved}
              />

              <SummaryRow
                label="Shipment"
                value={stats.shipments}
              />

              <SummaryRow
                label="Dalam Perjalanan"
                value={stats.inTransit}
              />

              <SummaryRow
                label="Sudah Diterima"
                value={stats.delivered}
              />

              <SummaryRow
                label="Ditolak"
                value={stats.rejected}
              />
            </div>

            <div className="border-t border-slate-100 p-5">
              <Link
                href="/dashboard/posko/scan"
                className="flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Buka Secure Scan →
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: number;
  description: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-lg font-bold text-slate-700">
          {icon}
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {description}
      </p>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg font-bold text-slate-700 transition group-hover:bg-slate-900 group-hover:text-white">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="font-semibold text-slate-900">
            {title}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
}

function RequestRow({
  request,
}: {
  request: AidRequest;
}) {
  const shipmentStatus = getShipmentStatus(request);
  const shipmentCode = getShipmentCode(request);

  return (
    <Link
      href={`/dashboard/posko/requests/${request.id}`}
      className="block px-5 py-4 transition hover:bg-slate-50"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-slate-900">
              {request.request_code}
            </p>

            <StatusBadge status={request.status} />
          </div>

          <p className="mt-1 truncate text-sm text-slate-500">
            {request.reason || "Permintaan bantuan"}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {formatDate(request.requested_at)}
          </p>
        </div>

        <div className="shrink-0 text-right">
          {shipmentCode ? (
            <>
              <p className="text-xs font-semibold text-slate-700">
                {shipmentCode}
              </p>

              <div className="mt-1">
                <StatusBadge status={shipmentStatus ?? "SHIPMENT"} />
              </div>
            </>
          ) : (
            <span className="text-xs text-slate-400">
              Belum ada shipment
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function StatusBadge({
  status,
}: {
  status?: string | null;
}) {
  const normalized = status?.toUpperCase() ?? "-";

  const classes =
    normalized === "APPROVED"
      ? "bg-emerald-50 text-emerald-700"
      : normalized === "PENDING"
        ? "bg-amber-50 text-amber-700"
        : normalized === "REJECTED"
          ? "bg-red-50 text-red-700"
          : normalized === "IN_TRANSIT"
            ? "bg-blue-50 text-blue-700"
            : normalized === "DELIVERED"
              ? "bg-emerald-50 text-emerald-700"
              : normalized === "READY"
                ? "bg-violet-50 text-violet-700"
                : "bg-slate-100 text-slate-600";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${classes}`}
    >
      {formatStatus(normalized)}
    </span>
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
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="px-5 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-xl text-slate-400">
        ▤
      </div>

      <p className="mt-4 text-sm font-semibold text-slate-700">
        {title}
      </p>

      <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-6">
          <div className="h-10 w-64 rounded-lg bg-slate-200" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-32 rounded-2xl bg-slate-200"
              />
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <div className="h-96 rounded-2xl bg-slate-200" />
            <div className="h-96 rounded-2xl bg-slate-200" />
          </div>
        </div>
      </div>
    </main>
  );
}

function getShipmentId(request: AidRequest) {
  return (
    request.shipment_id ??
    request.shipment?.id ??
    null
  );
}

function getShipmentCode(request: AidRequest) {
  return (
    request.shipment_code ??
    request.shipment?.shipment_code ??
    null
  );
}

function getShipmentStatus(request: AidRequest) {
  return (
    request.shipment_status ??
    request.shipment?.status ??
    null
  );
}

function formatStatus(status: string) {
  const labels: Record<string, string> = {
    PENDING: "Menunggu",
    APPROVED: "Disetujui",
    REJECTED: "Ditolak",
    PREPARING: "Persiapan",
    READY: "Siap Dikirim",
    IN_TRANSIT: "Dalam Perjalanan",
    DELIVERED: "Diterima",
    CANCELLED: "Dibatalkan",
  };

  return labels[status] ?? status;
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
