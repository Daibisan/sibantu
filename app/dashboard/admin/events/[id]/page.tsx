"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  MapPin,
  Navigation,
  RefreshCw,
  ShieldAlert,
  Siren,
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

type EventLocation = {
  id: number;
  physical_location_id: number;
  type: string;
  status: string;
  activated_at: string;
  deactivated_at: string | null;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
};

type EventDetailResponse = {
  success: boolean;
  event: Event;
  locations: EventLocation[];
};

function eventStatusConfig(status: string) {
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
        icon: AlertCircle,
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

function locationStatusConfig(status: string) {
  switch (status) {
    case "ACTIVE":
      return {
        label: "Aktif",
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-700",
      };

    case "INACTIVE":
      return {
        label: "Tidak Aktif",
        className:
          "border-slate-200 bg-slate-100 text-slate-500",
      };

    default:
      return {
        label: status,
        className:
          "border-slate-200 bg-slate-100 text-slate-500",
      };
  }
}

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function locationTypeLabel(type: string) {
  switch (type) {
    case "WAREHOUSE":
      return "Gudang";

    case "MAIN_POST":
      return "Posko Utama";

    case "FIELD_POST":
      return "Posko Lapangan";

    case "CHECKPOINT":
      return "Checkpoint";

    default:
      return type;
  }
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();

  const id = params.id as string;

  const [data, setData] =
    useState<EventDetailResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function loadEvent(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await fetch(
        `/api/events/${id}`,
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Gagal mengambil detail event"
        );
      }

      setData(result);
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
    if (id) {
      loadEvent();
    }
  }, [id]);

  if (loading) {
    return (
      <main className="space-y-6">
        <div className="h-5 w-48 animate-pulse rounded bg-slate-200" />

        <div className="h-40 animate-pulse rounded-2xl bg-white" />

        <div className="grid gap-5 lg:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-96 animate-pulse rounded-2xl bg-white"
            />
          ))}
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="space-y-5">
        <button
          type="button"
          onClick={() =>
            router.push(
              "/dashboard/admin/events"
            )
          }
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Event Bencana
        </button>

        <section className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

            <div>
              <h2 className="font-semibold text-red-800">
                Event tidak dapat dimuat
              </h2>

              <p className="mt-1 text-sm text-red-700">
                {error ||
                  "Event tidak ditemukan."}
              </p>

              <button
                type="button"
                onClick={() => loadEvent(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Coba lagi
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const { event, locations } = data;

  const eventStatus = eventStatusConfig(
    event.status
  );

  const EventStatusIcon = eventStatus.icon;

  const activeLocations = locations.filter(
    (location) =>
      location.status === "ACTIVE"
  ).length;

  return (
    <main className="space-y-6">
      {/* Back */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/dashboard/admin/events"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Event Bencana
        </Link>

        <button
          type="button"
          onClick={() => loadEvent(true)}
          disabled={refreshing}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw
            className={[
              "h-3.5 w-3.5",
              refreshing ? "animate-spin" : "",
            ].join(" ")}
          />
          Refresh
        </button>
      </div>

      {/* Event Header */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600 sm:flex">
              <Siren className="h-6 w-6" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-semibold text-teal-700">
                  {event.code}
                </span>

                <span className="text-slate-300">
                  •
                </span>

                <span className="text-xs text-slate-400">
                  Event Bencana
                </span>
              </div>

              <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                {event.name}
              </h1>

              {event.description && (
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  {event.description}
                </p>
              )}
            </div>
          </div>

          <div
            className={`inline-flex w-fit items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold ${eventStatus.className}`}
          >
            <EventStatusIcon className="h-4 w-4" />
            {eventStatus.label}
          </div>
        </div>

        <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3">
          <EventMeta
            icon={CalendarDays}
            label="Mulai"
            value={formatDate(event.started_at)}
          />

          <EventMeta
            icon={Clock3}
            label="Berakhir"
            value={formatDate(event.ended_at)}
          />

          <EventMeta
            icon={MapPin}
            label="Lokasi Operasional"
            value={`${locations.length} lokasi`}
            secondary={`${activeLocations} lokasi aktif`}
          />
        </div>
      </section>

      {/* Operational locations */}
      <section>
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-teal-600" />

              <h2 className="text-lg font-bold text-slate-900">
                Lokasi Operasional
              </h2>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Titik operasional yang terdaftar pada
              event ini.
            </p>
          </div>

          <p className="text-xs font-medium text-slate-400">
            {activeLocations} aktif dari{" "}
            {locations.length} lokasi
          </p>
        </div>

        {locations.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
              <MapPin className="h-5 w-5" />
            </div>

            <p className="mt-3 text-sm font-semibold text-slate-700">
              Belum ada lokasi operasional
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Lokasi yang terhubung dengan event akan
              muncul di sini.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {locations.map((location) => (
              <LocationCard
                key={location.id}
                location={location}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function EventMeta({
  icon: Icon,
  label,
  value,
  secondary,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  secondary?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>

        <p className="mt-1 text-sm font-semibold text-slate-800">
          {value}
        </p>

        {secondary && (
          <p className="mt-0.5 text-xs text-emerald-600">
            {secondary}
          </p>
        )}
      </div>
    </div>
  );
}

function LocationCard({
  location,
}: {
  location: EventLocation;
}) {
  const status = locationStatusConfig(
    location.status
  );

  const googleMapsUrl =
    `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Map */}
      <div className="relative h-56 bg-slate-100">
        <iframe
          title={`Peta ${location.name}`}
          src={`${googleMapsUrl}&output=embed`}
          className="h-full w-full border-0"
          loading="lazy"
        />

        <div className="absolute left-3 top-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border bg-white px-2.5 py-1 text-[11px] font-semibold shadow-sm ${status.className}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {status.label}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold leading-5 text-slate-900">
              {location.name}
            </h3>

            <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-teal-600">
              <Navigation className="h-3 w-3" />
              {locationTypeLabel(location.type)}
            </p>
          </div>

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <MapPin className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Alamat
          </p>

          <p className="mt-1 text-sm leading-5 text-slate-600">
            {location.address}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
          <div>
            <p className="text-[11px] font-semibold text-slate-400">
              Latitude
            </p>

            <p className="mt-0.5 font-mono text-xs text-slate-600">
              {Number(location.latitude).toFixed(6)}
            </p>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-slate-400">
              Longitude
            </p>

            <p className="mt-0.5 font-mono text-xs text-slate-600">
              {Number(location.longitude).toFixed(6)}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-[11px] font-semibold text-slate-400">
            Diaktifkan
          </p>

          <p className="mt-0.5 text-xs text-slate-600">
            {formatDate(location.activated_at)}
          </p>
        </div>

        {location.deactivated_at && (
          <div className="mt-3">
            <p className="text-[11px] font-semibold text-slate-400">
              Dinonaktifkan
            </p>

            <p className="mt-0.5 text-xs text-slate-600">
              {formatDate(location.deactivated_at)}
            </p>
          </div>
        )}

        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
        >
          <ExternalLink className="h-4 w-4" />
          Buka di Google Maps
        </a>
      </div>
    </article>
  );
}