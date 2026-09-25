"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Truck,
  RotateCw,
  Search,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  QrCode,
  AlertCircle,
  PackageCheck,
} from "lucide-react";

type PoskoShipment = {
  id: number;
  shipment_code: string;
  request_id: number;
  request_code: string;
  event_name: string;
  requester_location_name: string;
  status: string;
  requested_at: string;
  dispatched_at?: string | null;
  delivered_at?: string | null;
};

export default function PoskoShipmentsPage() {
  const [shipments, setShipments] = useState<PoskoShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  async function loadShipments() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/aid-requests", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Gagal mengambil data pengiriman.");
      }

      // Filter only requests that have shipments
      const requestsWithShipment = (data.requests ?? [])
        .filter((r: any) => r.shipment_id || r.shipment_code)
        .map((r: any) => ({
          id: Number(r.shipment_id),
          shipment_code: r.shipment_code,
          request_id: Number(r.id),
          request_code: r.request_code,
          event_name: r.event_name,
          requester_location_name: r.requester_location_name,
          status: r.shipment_status || "READY",
          requested_at: r.requested_at,
        }));

      setShipments(requestsWithShipment);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadShipments();
  }, []);

  const filtered = useMemo(() => {
    return shipments.filter((item) => {
      const matchSearch =
        !search ||
        item.shipment_code?.toLowerCase().includes(search.toLowerCase()) ||
        item.request_code?.toLowerCase().includes(search.toLowerCase());

      const matchStatus =
        statusFilter === "ALL" || item.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [shipments, search, statusFilter]);

  function getStatusBadge(status: string) {
    switch (status) {
      case "DELIVERED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "IN_TRANSIT":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "READY":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "PREPARING":
        return "bg-slate-50 text-slate-700 border-slate-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Daftar Pengiriman Bantuan
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Pantau status armada dan verifikasi penerimaan bantuan logistik untuk posko Anda.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/posko/scan"
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-700"
          >
            <QrCode className="h-4 w-4" />
            Buka QR Scanner
          </Link>
          <button
            onClick={loadShipments}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            <RotateCw className="h-3.5 w-3.5" />
            Segarkan
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kode shipment atau request..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-xs text-slate-900 outline-none transition focus:border-teal-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          {["ALL", "IN_TRANSIT", "READY", "DELIVERED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === st
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {st === "ALL" ? "Semua" : st}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-xs text-red-700">
          <AlertCircle className="mx-auto mb-2 h-6 w-6 text-red-500" />
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <Truck className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-700">
            Belum ada pengiriman bantuan
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Pengiriman yang telah dipersiapkan oleh gudang akan muncul di sini.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-slate-900">
                    {item.shipment_code}
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${getStatusBadge(
                      item.status
                    )}`}
                  >
                    {item.status}
                  </span>
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  Pengajuan: <span className="font-medium text-slate-700">{item.request_code}</span>
                </p>

                <div className="mt-3 space-y-1 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <span>{item.requester_location_name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      {new Date(item.requested_at).toLocaleDateString("id-ID")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 border-t border-slate-100 pt-4">
                {item.status === "DELIVERED" ? (
                  <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Sudah Diterima di Posko
                  </div>
                ) : (
                  <Link
                    href="/dashboard/posko/scan"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-50 py-2 text-xs font-semibold text-teal-700 transition hover:bg-teal-100"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    Verifikasi Penerimaan (Scan QR)
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
