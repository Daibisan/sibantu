"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Eye,
  MapPin,
  RefreshCw,
  Search,
  UserRound,
  XCircle,
} from "lucide-react";

type AidRequest = {
  id: number;
  request_code: string;
  event_code: string;
  event_name: string;
  requester_location_name: string;
  submitted_by_name: string;
  status: string;
  reason: string;
  requested_at: string;
  approved_at: string | null;
};

const STATUS_OPTIONS = [
  "ALL",
  "PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "FULFILLED",
  "CANCELLED",
];

function statusConfig(status: string) {
  switch (status) {
    case "PENDING":
      return {
        label: "Menunggu",
        className:
          "border-amber-200 bg-amber-50 text-amber-700",
        icon: Clock3,
      };

    case "UNDER_REVIEW":
      return {
        label: "Ditinjau",
        className:
          "border-blue-200 bg-blue-50 text-blue-700",
        icon: AlertCircle,
      };

    case "APPROVED":
      return {
        label: "Disetujui",
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-700",
        icon: CheckCircle2,
      };

    case "REJECTED":
      return {
        label: "Ditolak",
        className:
          "border-red-200 bg-red-50 text-red-700",
        icon: XCircle,
      };

    case "FULFILLED":
      return {
        label: "Terpenuhi",
        className:
          "border-violet-200 bg-violet-50 text-violet-700",
        icon: CheckCircle2,
      };

    case "CANCELLED":
      return {
        label: "Dibatalkan",
        className:
          "border-slate-200 bg-slate-100 text-slate-600",
        icon: XCircle,
      };

    default:
      return {
        label: status,
        className:
          "border-slate-200 bg-slate-100 text-slate-600",
        icon: ClipboardList,
      };
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<AidRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  async function loadRequests(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await fetch("/api/aid-requests", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Gagal mengambil request"
        );
      }

      setRequests(data.requests ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  const filteredRequests = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesStatus =
        statusFilter === "ALL" ||
        request.status === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return [
        request.request_code,
        request.event_code,
        request.event_name,
        request.requester_location_name,
        request.submitted_by_name,
        request.reason,
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [requests, search, statusFilter]);

  const summary = useMemo(
    () => ({
      total: requests.length,
      pending: requests.filter(
        (request) =>
          request.status === "PENDING" ||
          request.status === "UNDER_REVIEW"
      ).length,
      approved: requests.filter(
        (request) => request.status === "APPROVED"
      ).length,
      rejected: requests.filter(
        (request) => request.status === "REJECTED"
      ).length,
    }),
    [requests]
  );

  if (loading) {
    return (
      <main className="space-y-6">
        <div>
          <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-200" />
          <div className="mt-2 h-4 w-80 animate-pulse rounded bg-slate-200" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white"
            />
          ))}
        </div>

        <div className="h-96 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      </main>
    );
  }

  return (
    <main className="space-y-6">
      {/* Header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <ClipboardList className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Permintaan Bantuan
              </h1>

              <p className="mt-0.5 text-sm text-slate-500">
                Kelola dan verifikasi permintaan bantuan dari posko.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadRequests(true)}
          disabled={refreshing}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

          <div>
            <p className="font-semibold">
              Gagal memuat data
            </p>

            <p className="mt-0.5 text-red-600">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Summary */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Permintaan"
          value={summary.total}
          icon={ClipboardList}
          iconClass="bg-slate-100 text-slate-600"
        />

        <SummaryCard
          label="Perlu Ditinjau"
          value={summary.pending}
          icon={Clock3}
          iconClass="bg-amber-50 text-amber-600"
        />

        <SummaryCard
          label="Disetujui"
          value={summary.approved}
          icon={CheckCircle2}
          iconClass="bg-emerald-50 text-emerald-600"
        />

        <SummaryCard
          label="Ditolak"
          value={summary.rejected}
          icon={XCircle}
          iconClass="bg-red-50 text-red-600"
        />
      </section>

      {/* Filters */}
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
              placeholder="Cari kode request, event, posko, atau pemohon..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status === "ALL"
                  ? "Semua Status"
                  : statusConfig(status).label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>
            Menampilkan{" "}
            <span className="font-semibold text-slate-700">
              {filteredRequests.length}
            </span>{" "}
            dari{" "}
            <span className="font-semibold text-slate-700">
              {requests.length}
            </span>{" "}
            permintaan
          </span>

          {(search || statusFilter !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("ALL");
              }}
              className="font-semibold text-teal-600 hover:text-teal-700"
            >
              Reset filter
            </button>
          )}
        </div>
      </section>

      {/* Empty */}
      {filteredRequests.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <ClipboardList className="h-6 w-6" />
          </div>

          <h2 className="mt-4 text-base font-semibold text-slate-900">
            {requests.length === 0
              ? "Belum ada permintaan bantuan"
              : "Tidak ada hasil"}
          </h2>

          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            {requests.length === 0
              ? "Request dari posko akan muncul di halaman ini."
              : "Coba ubah kata kunci pencarian atau filter status."}
          </p>
        </section>
      ) : (
        <>
          {/* Desktop table */}
          <section className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                      Permintaan
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                      Posko
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                      Pemohon
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                      Status
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                      Waktu
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-400">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredRequests.map((request) => (
                    <RequestTableRow
                      key={request.id}
                      request={request}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Mobile cards */}
          <section className="space-y-3 md:hidden">
            {filteredRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
              />
            ))}
          </section>
        </>
      )}
    </main>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  iconClass,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function RequestTableRow({
  request,
}: {
  request: AidRequest;
}) {
  const config = statusConfig(request.status);
  const StatusIcon = config.icon;

  return (
    <tr className="group transition-colors hover:bg-slate-50/70">
      <td className="px-5 py-4">
        <div>
          <p className="font-semibold text-slate-900">
            {request.request_code}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {request.event_code}
          </p>
        </div>
      </td>

      <td className="px-5 py-4">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

          <div>
            <p className="text-sm font-medium text-slate-800">
              {request.requester_location_name}
            </p>

            <p className="mt-0.5 max-w-xs truncate text-xs text-slate-400">
              {request.event_name}
            </p>
          </div>
        </div>
      </td>

      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <UserRound className="h-4 w-4" />
          </div>

          <span className="text-sm text-slate-700">
            {request.submitted_by_name}
          </span>
        </div>
      </td>

      <td className="px-5 py-4">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${config.className}`}
        >
          <StatusIcon className="h-3.5 w-3.5" />
          {config.label}
        </span>
      </td>

      <td className="px-5 py-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <CalendarDays className="h-4 w-4 text-slate-400" />

          {formatDate(request.requested_at)}
        </div>
      </td>

      <td className="px-5 py-4 text-right">
        <Link
          href={`/dashboard/admin/requests/${request.id}`}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 opacity-0 shadow-sm transition group-hover:opacity-100 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
        >
          <Eye className="h-3.5 w-3.5" />
          Detail
        </Link>
      </td>
    </tr>
  );
}

function RequestCard({
  request,
}: {
  request: AidRequest;
}) {
  const config = statusConfig(request.status);
  const StatusIcon = config.icon;

  return (
    <Link
      href={`/dashboard/admin/requests/${request.id}`}
      className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition active:bg-slate-50"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">
            {request.request_code}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {request.event_code}
          </p>
        </div>

        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${config.className}`}
        >
          <StatusIcon className="h-3 w-3" />
          {config.label}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-start gap-2.5">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800">
              {request.requester_location_name}
            </p>

            <p className="mt-0.5 truncate text-xs text-slate-400">
              {request.event_name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <UserRound className="h-4 w-4 shrink-0 text-slate-400" />

          <p className="text-sm text-slate-600">
            {request.submitted_by_name}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />

          <p className="text-sm text-slate-500">
            {formatDate(request.requested_at)}
          </p>
        </div>
      </div>

      {request.reason && (
        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Alasan
          </p>

          <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">
            {request.reason}
          </p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-end gap-1 text-xs font-semibold text-teal-600">
        Lihat detail
        <Eye className="h-3.5 w-3.5" />
      </div>
    </Link>
  );
}