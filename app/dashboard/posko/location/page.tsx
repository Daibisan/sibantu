"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MapPin,
  Building,
  Users,
  Phone,
  Shield,
  Clock,
  ArrowRight,
  Package,
  RotateCw,
} from "lucide-react";

export default function PoskoLocationPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMe() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadMe();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Informasi Posko Lapangan
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Detail koordinasi, wilayah penugasan, dan status operasional posko.
          </p>
        </div>

        <Link
          href="/dashboard/posko/requests"
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-700"
        >
          <Package className="h-4 w-4" />
          Ajukan Kebutuhan Logistik
        </Link>
      </div>

      {/* Main Posko Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
            <Building className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                Posko Lapangan Penanggulangan Bencana
              </h2>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                OPERASIONAL AKTIF
              </span>
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              Sektor Lapangan Bencana Alam · Terhubung ke Gudang Utama BPBD
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 border-t border-slate-100 pt-6 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <Shield className="h-4 w-4 text-teal-600" />
              Petugas Bertugas
            </div>
            <p className="mt-2 text-sm font-bold text-slate-800">
              {user?.name || "Petugas Posko"}
            </p>
            <p className="text-xs text-slate-500">{user?.email || "posko@sibantu.id"}</p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <Users className="h-4 w-4 text-teal-600" />
              Estimasi Pengungsi
            </div>
            <p className="mt-2 text-sm font-bold text-slate-800">350 Jiwa</p>
            <p className="text-xs text-slate-500">75 Kepala Keluarga terdata</p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <Clock className="h-4 w-4 text-teal-600" />
              Status Distribusi
            </div>
            <p className="mt-2 text-sm font-bold text-emerald-600">Siap Terima Pasokan</p>
            <p className="text-xs text-slate-500">Scan QR siap beroperasi</p>
          </div>
        </div>
      </div>

      {/* Panduan Operasional Lapangan */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900">
          Alur Kerja Penerimaan Bantuan Posko
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-100 p-4">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
              1
            </span>
            <p className="mt-3 text-xs font-bold text-slate-800">
              Ajukan Permintaan
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Hitung kebutuhan mendesak posko dan input melalui menu pengajuan bantuan.
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 p-4">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
              2
            </span>
            <p className="mt-3 text-xs font-bold text-slate-800">
              Persetujuan & Pengiriman
            </p>
            <p className="mt-1 text-xs text-slate-500">
              BPBD memverifikasi dan Gudang mempersiapkan armada beserta QR Manifest aman.
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 p-4">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
              3
            </span>
            <p className="mt-3 text-xs font-bold text-slate-800">
              Scan & Serah Terima
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Pindai QR fisik saat armada tiba untuk validasi penerimaan barang secara sah.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
