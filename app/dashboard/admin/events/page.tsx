"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  RefreshCw,
  Search,
  Siren,
  XCircle,
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

type EventsResponse = {
  success: boolean;
  events: Event[];
};

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusConfig(status: string) {
  switch (status) {
    case "ACTIVE":
      return {
        label: "Aktif",
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-700",
        icon: CheckCircle2,
      };

    case "COMPLETED":
      return {
        label: "Selesai",
        className:
          "border-slate-200 bg-slate-100 text-slate-600",
        icon: CheckCircle2,
      };

    case "CANCELLED":
      return {
        label: "Dibatalkan",
        className:
          "border-red-200 bg-red-50 text-red-700",
        icon: XCircle,
      };

    case "PLANNED":
      return {
        label: "Direncanakan",
        className:
          "border-amber-200 bg-amber-50 text-amber-700",
        icon: Clock3,
      };

    default:
      return {
        label: status,
        className:
          "border-slate-200 bg-slate-100 text-slate-600",
        icon: Clock3,
      };
  }
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  async function loadEvents(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await fetch("/api/events", {
        cache: "no-store",
      });

      const result: EventsResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          "Gagal mengambil data event bencana."
        );
      }

      setEvents(result.events ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat mengambil data."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return events.filter((event) => {
      const matchesSearch =
        !keyword ||
        event.code.toLowerCase().includes(keyword) ||
        event.name.toLowerCase().includes(keyword) ||
        (event.description ?? "")
          .toLowerCase()
          .includes(keyword);

      const matchesStatus =
        statusFilter === "ALL" ||
        event.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [events, search, statusFilter]);

  const activeCount = events.filter(
    (event) => event.status === "ACTIVE"
  ).length;

  const completedCount = events.filter(
    (event) => event.status === "COMPLETED"
  ).length;

  const plannedCount = events.filter(
    (event) => event.status === "PLANNED"
  ).length;

  if (loading) {
    return <LoadingState />;
  }

  return (
    <main className="space-y-6">
      {/* Header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
              <Siren className="h-5 w-5" />
            </div>

            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Event Bencana
            </h1>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Kelola event bencana dan lokasi operasional
            SIBANTU.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadEvents(true)}
          disabled={refreshing}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            className={[
              "h-4 w-4",
              refreshing ? "animate-spin" : "",
            ].join(" ")}
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
              <p className="text-sm font-semibold text-red-800">
                Gagal memuat event
              </p>

              <p className="mt-1 text-sm text-red-700">
                {error}
              </p>

              <button
                type="button"
                onClick={() => loadEvents(true)}
                className="mt-3 text-xs font-bold text-red-700 underline underline-offset-2"
              >
                Coba lagi
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Summary */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Total Event"
          value={events.length}
          icon={Siren}
        />

        <SummaryCard
          label="Event Aktif"
          value={activeCount}
          icon={CheckCircle2}
          valueClassName="text-emerald-600"
        />

        <SummaryCard
          label="Direncanakan"
          value={plannedCount}
          icon={Clock3}
          valueClassName="text-amber-600"
        />

        <SummaryCard
          label="Selesai"
          value={completedCount}
          icon={CalendarDays}
          valueClassName="text-slate-600"
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
              placeholder="Cari kode atau nama event..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
          >
            <option value="ALL">Semua Status</option>
            <option value="ACTIVE">Aktif</option>
            <option value="PLANNED">
              Direncanakan
            </option>
            <option value="COMPLETED">
              Selesai
            </option>
            <option value="CANCELLED">
              Dibatalkan
            </option>
          </select>
        </div>
      </section>

      {/* Result info */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Daftar Event
          </h2>

          <p className="mt-0.5 text-xs text-slate-400">
            Menampilkan {filteredEvents.length} dari{" "}
            {events.length} event
          </p>
        </div>
      </div>

      {/* Empty */}
      {filteredEvents.length === 0 ? (
        <EmptyState
          hasFilter={
            Boolean(search.trim()) ||
            statusFilter !== "ALL"
          }
          onReset={() => {
            setSearch("");
            setStatusFilter("ALL");
          }}
        />
      ) : (
        <>
          {/* Desktop */}
          <section className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Event
                    </th>

                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Status
                    </th>

                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Mulai
                    </th>

                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Berakhir
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-400">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredEvents.map((event) => (
                    <EventTableRow
                      key={event.id}
                      event={event}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Mobile */}
          <section className="space-y-3 md:hidden">
            {filteredEvents.map((event) => (
              <EventMobileCard
                key={event.id}
                event={event}
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
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>

        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <p
        className={`mt-3 text-2xl font-bold ${valueClassName}`}
      >
        {value}
      </p>
    </div>
  );
}

function EventTableRow({
  event,
}: {
  event: Event;
}) {
  const status = statusConfig(event.status);
  const StatusIcon = status.icon;

  return (
    <tr className="transition hover:bg-slate-50/70">
      <td className="px-5 py-4">
        <div className="min-w-0">
          <p className="font-mono text-xs font-semibold text-teal-700">
            {event.code}
          </p>

          <p className="mt-1 font-semibold text-slate-900">
            {event.name}
          </p>

          {event.description && (
            <p className="mt-1 max-w-lg truncate text-xs text-slate-400">
              {event.description}
            </p>
          )}
        </div>
      </td>

      <td className="px-5 py-4">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}
        >
          <StatusIcon className="h-3.5 w-3.5" />
          {status.label}
        </span>
      </td>

      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
        {formatDate(event.started_at)}
      </td>

      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
        {formatDate(event.ended_at)}
      </td>

      <td className="px-5 py-4 text-right">
        <Link
          href={`/dashboard/admin/events/${event.id}`}
          className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
        >
          Lihat Detail
        </Link>
      </td>
    </tr>
  );
}

function EventMobileCard({
  event,
}: {
  event: Event;
}) {
  const status = statusConfig(event.status);
  const StatusIcon = status.icon;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs font-semibold text-teal-700">
            {event.code}
          </p>

          <h3 className="mt-1 font-semibold leading-5 text-slate-900">
            {event.name}
          </h3>
        </div>

        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${status.className}`}
        >
          <StatusIcon className="h-3 w-3" />
          {status.label}
        </span>
      </div>

      {event.description && (
        <p className="mt-3 text-sm leading-5 text-slate-500">
          {event.description}
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Mulai
          </p>

          <p className="mt-1 text-xs font-medium text-slate-700">
            {formatDate(event.started_at)}
          </p>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Berakhir
          </p>

          <p className="mt-1 text-xs font-medium text-slate-700">
            {formatDate(event.ended_at)}
          </p>
        </div>
      </div>

      <Link
        href={`/dashboard/admin/events/${event.id}`}
        className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl bg-teal-600 text-sm font-semibold text-white transition hover:bg-teal-700"
      >
        Lihat Detail Event
      </Link>
    </article>
  );
}

function EmptyState({
  hasFilter,
  onReset,
}: {
  hasFilter: boolean;
  onReset: () => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        {hasFilter ? (
          <Search className="h-5 w-5" />
        ) : (
          <Siren className="h-5 w-5" />
        )}
      </div>

      <h3 className="mt-4 text-sm font-bold text-slate-800">
        {hasFilter
          ? "Event tidak ditemukan"
          : "Belum ada event bencana"}
      </h3>

      <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-400">
        {hasFilter
          ? "Tidak ada event yang sesuai dengan pencarian atau filter yang dipilih."
          : "Event bencana yang tersedia akan muncul di halaman ini."}
      </p>

      {hasFilter && (
        <button
          type="button"
          onClick={onReset}
          className="mt-4 text-xs font-bold text-teal-600 hover:text-teal-700"
        >
          Reset filter
        </button>
      )}
    </section>
  );
}

function LoadingState() {
  return (
    <main className="space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-72 animate-pulse rounded bg-slate-200" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-28 animate-pulse rounded-2xl bg-white"
          />
        ))}
      </div>

      <div className="h-20 animate-pulse rounded-2xl bg-white" />

      <div className="hidden h-80 animate-pulse rounded-2xl bg-white md:block" />

      <div className="space-y-3 md:hidden">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-48 animate-pulse rounded-2xl bg-white"
          />
        ))}
      </div>
    </main>
  );
}