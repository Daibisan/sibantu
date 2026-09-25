"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Package,
  RefreshCw,
  Search,
  Warehouse,
  XCircle,
} from "lucide-react";

type InventoryLot = {
  id: number;
  lot_code: string;
  aid_item_id: number;
  item_code: string;
  item_name: string;
  unit: string;
  event_location_id: number;
  location_name: string;
  on_hand_qty: number | string;
  reserved_qty: number | string;
  available_qty: number | string;
  status: string;
  received_at: string;
  expired_at: string | null;
};

type InventoryResponse = {
  success: boolean;
  inventory: InventoryLot[];
};

function numberValue(value: number | string) {
  return Number(value) || 0;
}

function formatNumber(value: number | string) {
  return numberValue(value).toLocaleString("id-ID");
}

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusConfig(status: string) {
  switch (status) {
    case "AVAILABLE":
      return {
        label: "Tersedia",
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-700",
        icon: CheckCircle2,
      };

    case "ALLOCATED":
      return {
        label: "Dialokasikan",
        className:
          "border-amber-200 bg-amber-50 text-amber-700",
        icon: Clock3,
      };

    case "DEPLETED":
      return {
        label: "Habis",
        className:
          "border-slate-200 bg-slate-100 text-slate-500",
        icon: Package,
      };

    case "EXPIRED":
      return {
        label: "Kedaluwarsa",
        className:
          "border-red-200 bg-red-50 text-red-700",
        icon: XCircle,
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

function getExpiryInfo(expiredAt: string | null) {
  if (!expiredAt) {
    return {
      label: "Tidak ada expiry",
      className: "text-slate-400",
    };
  }

  const expiry = new Date(expiredAt);
  const now = new Date();

  const diff =
    expiry.getTime() - now.getTime();

  const days = Math.ceil(
    diff / (1000 * 60 * 60 * 24)
  );

  if (days < 0) {
    return {
      label: "Sudah kedaluwarsa",
      className: "font-semibold text-red-600",
    };
  }

  if (days <= 3) {
    return {
      label: `${days} hari lagi`,
      className: "font-semibold text-red-600",
    };
  }

  if (days <= 7) {
    return {
      label: `${days} hari lagi`,
      className: "font-semibold text-amber-600",
    };
  }

  return {
    label: `${days} hari lagi`,
    className: "text-slate-500",
  };
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<
    InventoryLot[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [locationFilter, setLocationFilter] =
    useState("ALL");

  async function loadInventory(
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
        "/api/inventory",
        {
          cache: "no-store",
        }
      );

      const result: InventoryResponse =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          "Gagal mengambil data inventory."
        );
      }

      setInventory(result.inventory ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat mengambil inventory."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadInventory();
  }, []);

  const locations = useMemo(() => {
    return Array.from(
      new Set(
        inventory.map(
          (item) => item.location_name
        )
      )
    );
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    const keyword =
      search.trim().toLowerCase();

    return inventory.filter((item) => {
      const matchesSearch =
        !keyword ||
        item.item_name
          .toLowerCase()
          .includes(keyword) ||
        item.item_code
          .toLowerCase()
          .includes(keyword) ||
        item.lot_code
          .toLowerCase()
          .includes(keyword) ||
        item.location_name
          .toLowerCase()
          .includes(keyword);

      const matchesStatus =
        statusFilter === "ALL" ||
        item.status === statusFilter;

      const matchesLocation =
        locationFilter === "ALL" ||
        item.location_name ===
          locationFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesLocation
      );
    });
  }, [
    inventory,
    search,
    statusFilter,
    locationFilter,
  ]);

  const totalOnHand = inventory.reduce(
    (total, item) =>
      total + numberValue(item.on_hand_qty),
    0
  );

  const totalReserved = inventory.reduce(
    (total, item) =>
      total + numberValue(item.reserved_qty),
    0
  );

  const totalAvailable = inventory.reduce(
    (total, item) =>
      total + numberValue(item.available_qty),
    0
  );

  const activeLots = inventory.filter(
    (item) =>
      item.status === "AVAILABLE" ||
      item.status === "ALLOCATED"
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
              <Warehouse className="h-5 w-5" />
            </div>

            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Inventory
            </h1>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Pantau stok bantuan, lot, reservasi,
            dan prioritas FEFO.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadInventory(true)}
          disabled={refreshing}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            className={[
              "h-4 w-4",
              refreshing
                ? "animate-spin"
                : "",
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
                Gagal memuat inventory
              </p>

              <p className="mt-1 text-sm text-red-700">
                {error}
              </p>

              <button
                type="button"
                onClick={() =>
                  loadInventory(true)
                }
                className="mt-3 text-xs font-bold text-red-700 underline underline-offset-2"
              >
                Coba lagi
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Summary */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Stok"
          value={formatNumber(totalOnHand)}
          icon={Package}
        />

        <SummaryCard
          label="Stok Tersedia"
          value={formatNumber(
            totalAvailable
          )}
          icon={CheckCircle2}
          valueClassName="text-emerald-600"
        />

        <SummaryCard
          label="Stok Reserved"
          value={formatNumber(totalReserved)}
          icon={Clock3}
          valueClassName="text-amber-600"
        />

        <SummaryCard
          label="Lot Aktif"
          value={formatNumber(activeLots)}
          icon={Warehouse}
        />
      </section>

      {/* Filters */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Cari barang, kode lot, atau lokasi..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
          >
            <option value="ALL">
              Semua Status
            </option>
            <option value="AVAILABLE">
              Tersedia
            </option>
            <option value="ALLOCATED">
              Dialokasikan
            </option>
            <option value="DEPLETED">
              Habis
            </option>
            <option value="EXPIRED">
              Kedaluwarsa
            </option>
          </select>

          <select
            value={locationFilter}
            onChange={(event) =>
              setLocationFilter(
                event.target.value
              )
            }
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
          >
            <option value="ALL">
              Semua Lokasi
            </option>

            {locations.map((location) => (
              <option
                key={location}
                value={location}
              >
                {location}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* FEFO notice */}
      <section className="rounded-2xl border border-teal-100 bg-teal-50/60 p-4">
        <div className="flex items-start gap-3">
          <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />

          <div>
            <p className="text-sm font-semibold text-teal-900">
              Prioritas FEFO
            </p>

            <p className="mt-1 text-xs leading-5 text-teal-700">
              Lot dengan tanggal kedaluwarsa
              paling dekat diprioritaskan terlebih
              dahulu pada proses allocation.
            </p>
          </div>
        </div>
      </section>

      {/* Result */}
      <div>
        <h2 className="text-sm font-bold text-slate-900">
          Daftar Lot Inventory
        </h2>

        <p className="mt-0.5 text-xs text-slate-400">
          Menampilkan{" "}
          {filteredInventory.length} dari{" "}
          {inventory.length} lot
        </p>
      </div>

      {filteredInventory.length === 0 ? (
        <EmptyState
          hasFilter={
            Boolean(search.trim()) ||
            statusFilter !== "ALL" ||
            locationFilter !== "ALL"
          }
          onReset={() => {
            setSearch("");
            setStatusFilter("ALL");
            setLocationFilter("ALL");
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
                      Barang
                    </th>

                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Lot
                    </th>

                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Lokasi
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-400">
                      Stok
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-400">
                      Reserved
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-400">
                      Available
                    </th>

                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Expired
                    </th>

                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredInventory.map(
                    (item, index) => (
                      <InventoryRow
                        key={item.id}
                        item={item}
                        isFirst={index === 0}
                      />
                    )
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Mobile */}
          <section className="space-y-3 md:hidden">
            {filteredInventory.map(
              (item, index) => (
                <InventoryMobileCard
                  key={item.id}
                  item={item}
                  isFirst={index === 0}
                />
              )
            )}
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
  value: string;
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

function InventoryRow({
  item,
  isFirst,
}: {
  item: InventoryLot;
  isFirst: boolean;
}) {
  const status = statusConfig(item.status);
  const StatusIcon = status.icon;
  const expiry = getExpiryInfo(
    item.expired_at
  );

  return (
    <tr className="transition hover:bg-slate-50/70">
      <td className="px-5 py-4">
        <p className="font-semibold text-slate-900">
          {item.item_name}
        </p>

        <p className="mt-0.5 font-mono text-xs text-teal-600">
          {item.item_code}
        </p>
      </td>

      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          {isFirst && (
            <span className="rounded-md bg-teal-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-teal-700">
              FEFO
            </span>
          )}

          <span className="font-mono text-xs font-semibold text-slate-700">
            {item.lot_code}
          </span>
        </div>

        <p className="mt-1 text-[11px] text-slate-400">
          Diterima{" "}
          {formatDate(item.received_at)}
        </p>
      </td>

      <td className="px-5 py-4">
        <div className="flex items-center gap-1.5 text-sm text-slate-600">
          <Warehouse className="h-3.5 w-3.5 text-slate-400" />
          {item.location_name}
        </div>
      </td>

      <td className="px-5 py-4 text-right">
        <span className="font-semibold text-slate-800">
          {formatNumber(item.on_hand_qty)}
        </span>

        <span className="ml-1 text-xs text-slate-400">
          {item.unit}
        </span>
      </td>

      <td className="px-5 py-4 text-right">
        <span className="font-semibold text-amber-600">
          {formatNumber(item.reserved_qty)}
        </span>
      </td>

      <td className="px-5 py-4 text-right">
        <span className="font-bold text-emerald-600">
          {formatNumber(item.available_qty)}
        </span>

        <span className="ml-1 text-xs text-slate-400">
          {item.unit}
        </span>
      </td>

      <td className="px-5 py-4">
        <p className="text-xs font-medium text-slate-600">
          {item.expired_at
            ? formatDate(item.expired_at)
            : "-"}
        </p>

        <p
          className={`mt-0.5 text-[11px] ${expiry.className}`}
        >
          {expiry.label}
        </p>
      </td>

      <td className="px-5 py-4">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}
        >
          <StatusIcon className="h-3.5 w-3.5" />
          {status.label}
        </span>
      </td>
    </tr>
  );
}

function InventoryMobileCard({
  item,
  isFirst,
}: {
  item: InventoryLot;
  isFirst: boolean;
}) {
  const status = statusConfig(item.status);
  const StatusIcon = status.icon;
  const expiry = getExpiryInfo(
    item.expired_at
  );

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {isFirst && (
                <span className="rounded-md bg-teal-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-teal-700">
                  FEFO
                </span>
              )}

              <span className="font-mono text-xs font-semibold text-teal-600">
                {item.lot_code}
              </span>
            </div>

            <h3 className="mt-1 font-semibold text-slate-900">
              {item.item_name}
            </h3>

            <p className="mt-0.5 text-xs text-slate-400">
              {item.item_code}
            </p>
          </div>

          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${status.className}`}
          >
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </span>
        </div>

        <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
          <Warehouse className="h-3.5 w-3.5 text-slate-400" />
          {item.location_name}
        </div>

        <div className="mt-4 grid grid-cols-3 divide-x rounded-xl border border-slate-100 bg-slate-50">
          <StockValue
            label="Stok"
            value={item.on_hand_qty}
            unit={item.unit}
          />

          <StockValue
            label="Reserved"
            value={item.reserved_qty}
            unit={item.unit}
            valueClassName="text-amber-600"
          />

          <StockValue
            label="Available"
            value={item.available_qty}
            unit={item.unit}
            valueClassName="text-emerald-600"
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Diterima
            </p>

            <p className="mt-1 text-xs text-slate-600">
              {formatDate(item.received_at)}
            </p>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Kedaluwarsa
            </p>

            <p className="mt-1 text-xs text-slate-600">
              {item.expired_at
                ? formatDate(item.expired_at)
                : "-"}
            </p>

            <p
              className={`mt-0.5 text-[11px] ${expiry.className}`}
            >
              {expiry.label}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

function StockValue({
  label,
  value,
  unit,
  valueClassName = "text-slate-800",
}: {
  label: string;
  value: number | string;
  unit: string;
  valueClassName?: string;
}) {
  return (
    <div className="p-3 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1 text-sm font-bold ${valueClassName}`}
      >
        {formatNumber(value)}
      </p>

      <p className="text-[10px] text-slate-400">
        {unit}
      </p>
    </div>
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
        <Search className="h-5 w-5" />
      </div>

      <h3 className="mt-4 text-sm font-bold text-slate-800">
        {hasFilter
          ? "Inventory tidak ditemukan"
          : "Belum ada inventory"}
      </h3>

      <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-400">
        {hasFilter
          ? "Tidak ada lot yang sesuai dengan pencarian atau filter."
          : "Data lot inventory akan muncul di halaman ini."}
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
        <div className="h-7 w-40 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-72 animate-pulse rounded bg-slate-200" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-28 animate-pulse rounded-2xl bg-white"
          />
        ))}
      </div>

      <div className="h-20 animate-pulse rounded-2xl bg-white" />

      <div className="h-16 animate-pulse rounded-2xl bg-white" />

      <div className="hidden h-96 animate-pulse rounded-2xl bg-white md:block" />

      <div className="space-y-3 md:hidden">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-64 animate-pulse rounded-2xl bg-white"
          />
        ))}
      </div>
    </main>
  );
}