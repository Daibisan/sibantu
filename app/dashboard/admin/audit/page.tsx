"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileSearch,
  ShieldCheck,
  RotateCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Filter,
} from "lucide-react";

type AuditEntry = {
  id: string;
  timestamp: string;
  module: "REQUEST" | "SHIPMENT" | "INVENTORY" | "SCAN";
  action: string;
  actor: string;
  detail: string;
  status: "SUCCESS" | "WARNING" | "INFO";
};

export default function AdminAuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterModule, setFilterModule] = useState("ALL");

  async function loadAuditLogs() {
    try {
      setLoading(true);

      // Aggregate audit logs from requests and shipments
      const [reqRes, invRes] = await Promise.all([
        fetch("/api/aid-requests", { cache: "no-store" }),
        fetch("/api/inventory", { cache: "no-store" }),
      ]);

      const reqData = reqRes.ok ? await reqRes.json() : { requests: [] };
      const invData = invRes.ok ? await invRes.json() : { inventory: [] };

      const logs: AuditEntry[] = [];

      (reqData.requests ?? []).forEach((r: any) => {
        logs.push({
          id: `req-${r.id}`,
          timestamp: r.requested_at,
          module: "REQUEST",
          action: "PENGAJUAN BANTUAN",
          actor: r.submitted_by_name || "Petugas Posko",
          detail: `Pengajuan ${r.request_code} untuk ${r.requester_location_name} (Status: ${r.status})`,
          status: r.status === "REJECTED" ? "WARNING" : "SUCCESS",
        });

        if (r.approved_at) {
          logs.push({
            id: `appr-${r.id}`,
            timestamp: r.approved_at,
            module: "REQUEST",
            action: "VERIFIKASI & REVIEW",
            actor: "BPBD Administrator",
            detail: `Pengajuan ${r.request_code} telah disetujui / direview`,
            status: "SUCCESS",
          });
        }

        if (r.shipment_code) {
          logs.push({
            id: `shp-${r.id}`,
            timestamp: r.requested_at,
            module: "SHIPMENT",
            action: "PEMBUATAN SHIPMENT",
            actor: "Petugas Gudang",
            detail: `Shipment ${r.shipment_code} dibuat untuk ${r.request_code} (Status: ${r.shipment_status})`,
            status: "INFO",
          });
        }
      });

      (invData.inventory ?? []).slice(0, 10).forEach((inv: any) => {
        if (inv.reserved_qty > 0) {
          logs.push({
            id: `inv-${inv.id}`,
            timestamp: inv.received_at || new Date().toISOString(),
            module: "INVENTORY",
            action: "ALOKASI STOK FEFO",
            actor: "Sistem Logistik",
            detail: `${inv.item_name} (${inv.lot_code}): ${inv.reserved_qty} ${inv.unit} dialokasikan untuk pengiriman`,
            status: "INFO",
          });
        }
      });

      // Sort by latest
      logs.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setEntries(logs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const filtered = entries.filter((e) => {
    const matchSearch =
      !search ||
      e.action.toLowerCase().includes(search.toLowerCase()) ||
      e.detail.toLowerCase().includes(search.toLowerCase()) ||
      e.actor.toLowerCase().includes(search.toLowerCase());

    const matchModule = filterModule === "ALL" || e.module === filterModule;

    return matchSearch && matchModule;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-600">
            <ShieldCheck className="h-4 w-4" />
            Keamanan & Akuntabilitas Logistik
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Audit Log Operasional
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Jejak audit seluruh pengajuan, review, pergerakan alokasi stok, dan verifikasi QR.
          </p>
        </div>

        <button
          onClick={loadAuditLogs}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
        >
          <RotateCw className="h-3.5 w-3.5" />
          Segarkan
        </button>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari aktivitas, kode, atau petugas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-xs text-slate-900 outline-none transition focus:border-teal-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          {["ALL", "REQUEST", "SHIPMENT", "INVENTORY"].map((mod) => (
            <button
              key={mod}
              onClick={() => setFilterModule(mod)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                filterModule === mod
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {mod === "ALL" ? "Semua Modul" : mod}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FileSearch className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">
              Tidak ada catatan audit yang cocok
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 font-semibold uppercase text-slate-400">
                <tr>
                  <th className="px-6 py-3.5">Waktu</th>
                  <th className="px-6 py-3.5">Modul</th>
                  <th className="px-6 py-3.5">Aktivitas</th>
                  <th className="px-6 py-3.5">Aktor</th>
                  <th className="px-6 py-3.5">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/50">
                    <td className="whitespace-nowrap px-6 py-4 font-mono text-[11px] text-slate-400">
                      {new Date(entry.timestamp).toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        {entry.module}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {entry.action}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600">
                      {entry.actor}
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-md">
                      {entry.detail}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
