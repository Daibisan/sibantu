"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  ShieldAlert,
  AlertCircle,
  FileText,
  Truck,
  RotateCw,
} from "lucide-react";

type RequestItem = {
  id: number;
  aid_item_id: number;
  item_code: string;
  item_name: string;
  unit: string;
  requested_qty: number;
  approved_qty: number;
  status: string;
};

type Review = {
  id: number;
  reviewer_name: string;
  review_type: string;
  decision: string;
  note: string;
  reviewed_at: string;
};

type AidRequestDetail = {
  id: number;
  request_code: string;
  disaster_event_id: number;
  event_code: string;
  event_name: string;
  requester_location_id: number;
  requester_location_name: string;
  requester_location_address: string;
  submitted_by_name: string;
  status: string;
  reason: string;
  requested_at: string;
  approved_at: string | null;
};

export default function PoskoRequestDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [request, setRequest] = useState<AidRequestDetail | null>(null);
  const [items, setItems] = useState<RequestItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDetail() {
    if (!id) return;
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`/api/aid-requests/${id}`, {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Gagal mengambil detail pengajuan.");
      }

      setRequest(data.request);
      setItems(data.items ?? []);
      setReviews(data.reviews ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDetail();
  }, [id]);

  function getStatusBadge(status: string) {
    switch (status) {
      case "APPROVED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "PENDING":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "UNDER_REVIEW":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "REJECTED":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "FULFILLED":
        return "bg-teal-50 text-teal-700 border-teal-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
        <div className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
        <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-500" />
        <p className="font-semibold">{error || "Data tidak ditemukan."}</p>
        <Link
          href="/dashboard/posko/requests"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Daftar Pengajuan
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Back Button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard/posko/requests"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Pengajuan
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {request.request_code}
          </h1>
          <p className="text-xs text-slate-500">
            Event: <span className="font-medium text-slate-700">{request.event_name}</span> ({request.event_code})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadge(
              request.status
            )}`}
          >
            {request.status}
          </span>
          <button
            onClick={loadDetail}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            <RotateCw className="h-3.5 w-3.5" />
            Muat Ulang
          </button>
        </div>
      </div>

      {/* Info Overview Card */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <MapPin className="h-4 w-4 text-teal-600" />
            Lokasi Posko Tujuan
          </div>
          <p className="mt-2 text-sm font-bold text-slate-800">
            {request.requester_location_name}
          </p>
          <p className="mt-1 text-xs text-slate-500 line-clamp-2">
            {request.requester_location_address || "Alamat posko lapangan"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <Calendar className="h-4 w-4 text-teal-600" />
            Waktu Pengajuan
          </div>
          <p className="mt-2 text-sm font-bold text-slate-800">
            {new Date(request.requested_at).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Diajukan oleh: {request.submitted_by_name}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <FileText className="h-4 w-4 text-teal-600" />
            Alasan Kebutuhan
          </div>
          <p className="mt-2 text-xs text-slate-700 italic">
            "{request.reason}"
          </p>
        </div>
      </div>

      {/* Item Bantuan Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <h2 className="text-sm font-bold text-slate-900">
            Daftar Barang Bantuan yang Diajukan
          </h2>
          <p className="text-xs text-slate-500">
            Jumlah barang yang diminta dan kuota yang telah disetujui BPBD.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-400">
              <tr>
                <th className="px-6 py-3">Kode</th>
                <th className="px-6 py-3">Nama Barang</th>
                <th className="px-6 py-3 text-right">Diminta</th>
                <th className="px-6 py-3 text-right">Disetujui</th>
                <th className="px-6 py-3">Status Item</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-3.5 font-mono text-xs text-slate-500">
                    {item.item_code}
                  </td>
                  <td className="px-6 py-3.5 font-semibold text-slate-900">
                    {item.item_name}
                  </td>
                  <td className="px-6 py-3.5 text-right font-medium">
                    {item.requested_qty} {item.unit}
                  </td>
                  <td className="px-6 py-3.5 text-right font-bold text-teal-700">
                    {item.approved_qty} {item.unit}
                  </td>
                  <td className="px-6 py-3.5">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${getStatusBadge(
                        item.status
                      )}`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review History */}
      {reviews.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">
            Catatan Verifikasi & Review BPBD
          </h2>
          <div className="mt-4 space-y-3">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="rounded-xl border border-slate-100 bg-slate-50/70 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-slate-800">
                    {rev.reviewer_name}{" "}
                    <span className="font-normal text-slate-400">
                      ({rev.review_type})
                    </span>
                  </p>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getStatusBadge(
                      rev.decision
                    )}`}
                  >
                    {rev.decision}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  Catatan: {rev.note}
                </p>
                <p className="mt-1 text-[10px] text-slate-400">
                  {new Date(rev.reviewed_at).toLocaleString("id-ID")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Action to Scanner */}
      <div className="flex items-center justify-between rounded-2xl border border-teal-200 bg-teal-50 p-5">
        <div>
          <h3 className="text-sm font-bold text-teal-900">
            Barang bantuan sedang dikirim atau sudah tiba?
          </h3>
          <p className="mt-0.5 text-xs text-teal-700">
            Gunakan QR Scanner untuk melakukan verifikasi penerimaan saat armada tiba di posko.
          </p>
        </div>
        <Link
          href="/dashboard/posko/scan"
          className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-800"
        >
          <Truck className="h-4 w-4" />
          Buka QR Scanner
        </Link>
      </div>
    </div>
  );
}
