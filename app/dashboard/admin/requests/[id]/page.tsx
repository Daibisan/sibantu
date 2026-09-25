"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  MapPin,
  MessageSquare,
  Package,
  Save,
  UserRound,
  X,
  XCircle,
} from "lucide-react";

type RequestData = {
  id: number;
  request_code: string;
  event_code: string;
  event_name: string;
  requester_location_name: string;
  requester_location_address: string;
  submitted_by_name: string;
  status: string;
  reason: string;
  requested_at: string;
  approved_at: string | null;
};

type RequestItem = {
  id: number;
  aid_item_id: number;
  item_code: string;
  item_name: string;
  unit: string;
  description: string | null;
  requested_qty: number;
  approved_qty: number;
  status: string;
};

type Review = {
  id: number;
  reviewer_id: number;
  reviewer_name: string;
  review_type: string;
  decision: string;
  note: string;
  reviewed_at: string;
};

function statusConfig(status: string) {
  switch (status) {
    case "PENDING":
      return {
        label: "Menunggu Review",
        className:
          "border-amber-200 bg-amber-50 text-amber-700",
        icon: Clock3,
      };

    case "UNDER_REVIEW":
      return {
        label: "Sedang Ditinjau",
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

    default:
      return {
        label: status,
        className:
          "border-slate-200 bg-slate-100 text-slate-600",
        icon: ClipboardCheck,
      };
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function AdminRequestDetailPage() {
  const params = useParams();
  const router = useRouter();

  const id = params.id;

  const [request, setRequest] =
    useState<RequestData | null>(null);

  const [items, setItems] = useState<RequestItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [decision, setDecision] = useState("");
  const [note, setNote] = useState("");

  const [approvedQty, setApprovedQty] =
    useState<Record<number, number>>({});

  const [submitting, setSubmitting] = useState(false);

  async function loadRequest() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/aid-requests/${id}`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Gagal mengambil detail request"
        );
      }

      setRequest(data.request);
      setItems(data.items ?? []);
      setReviews(data.reviews ?? []);

      const initialQty: Record<number, number> = {};

      (data.items ?? []).forEach(
        (item: RequestItem) => {
          initialQty[item.aid_item_id] = Number(
            item.approved_qty
          );
        }
      );

      setApprovedQty(initialQty);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequest();
  }, [id]);

  const canReview = useMemo(() => {
    return (
      request?.status === "PENDING" ||
      request?.status === "UNDER_REVIEW"
    );
  }, [request]);

  const totalRequested = useMemo(() => {
    return items.reduce(
      (total, item) =>
        total + Number(item.requested_qty),
      0
    );
  }, [items]);

  const totalApproved = useMemo(() => {
    return items.reduce(
      (total, item) =>
        total +
        Number(
          approvedQty[item.aid_item_id] ??
            item.approved_qty ??
            0
        ),
      0
    );
  }, [items, approvedQty]);

  async function handleReview() {
    if (!decision) {
      alert("Pilih keputusan terlebih dahulu.");
      return;
    }

    if (!note.trim()) {
      alert("Catatan review wajib diisi.");
      return;
    }

    if (decision === "APPROVED") {
      for (const item of items) {
        const qty = Number(
          approvedQty[item.aid_item_id] ?? 0
        );

        if (
          Number.isNaN(qty) ||
          qty < 0 ||
          qty > Number(item.requested_qty)
        ) {
          alert(
            `Jumlah approval ${item.item_name} tidak valid.`
          );
          return;
        }
      }
    }

    try {
      setSubmitting(true);

      const response = await fetch(
        `/api/aid-requests/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            decision,
            note: note.trim(),
            items:
              decision === "APPROVED"
                ? items.map((item) => ({
                    aid_item_id: item.aid_item_id,
                    approved_qty: Number(
                      approvedQty[item.aid_item_id] ??
                        0
                    ),
                  }))
                : undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Gagal melakukan review"
        );
      }

      alert("Review berhasil disimpan.");

      setDecision("");
      setNote("");

      await loadRequest();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Gagal melakukan review"
      );
    } finally {
      setSubmitting(false);
    }
  }

  function updateApprovedQty(
    aidItemId: number,
    value: string
  ) {
    const numericValue =
      value === "" ? 0 : Number(value);

    setApprovedQty((current) => ({
      ...current,
      [aidItemId]: numericValue,
    }));
  }

  if (loading) {
    return (
      <main className="space-y-6">
        <div className="h-5 w-44 animate-pulse rounded bg-slate-200" />

        <div className="h-24 animate-pulse rounded-2xl bg-white" />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="h-72 animate-pulse rounded-2xl bg-white lg:col-span-2" />
          <div className="h-72 animate-pulse rounded-2xl bg-white" />
        </div>
      </main>
    );
  }

  if (error || !request) {
    return (
      <main className="space-y-5">
        <button
          type="button"
          onClick={() =>
            router.push(
              "/dashboard/admin/requests"
            )
          }
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Permintaan Bantuan
        </button>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">
                Gagal memuat request
              </p>

              <p className="mt-1">
                {error ||
                  "Request tidak ditemukan."}
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const config = statusConfig(request.status);
  const StatusIcon = config.icon;

  return (
    <main className="space-y-6">
      {/* Back */}
      <button
        type="button"
        onClick={() =>
          router.push(
            "/dashboard/admin/requests"
          )
        }
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Permintaan Bantuan
      </button>

      {/* Header */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600 sm:flex">
              <FileText className="h-5 w-5" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono text-sm font-semibold text-teal-700">
                  {request.request_code}
                </p>

                <span className="text-slate-300">
                  •
                </span>

                <p className="text-xs text-slate-400">
                  {request.event_code}
                </p>
              </div>

              <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                Detail Permintaan Bantuan
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Tinjau kebutuhan bantuan sebelum
                diteruskan ke proses alokasi.
              </p>
            </div>
          </div>

          <div
            className={`inline-flex w-fit items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold ${config.className}`}
          >
            <StatusIcon className="h-4 w-4" />
            {config.label}
          </div>
        </div>
      </section>

      {/* Main information */}
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <ClipboardCheck className="h-4 w-4" />
              </div>

              <div>
                <h2 className="font-semibold text-slate-900">
                  Informasi Permintaan
                </h2>

                <p className="text-xs text-slate-400">
                  Detail pengajuan dari posko
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-x-8 gap-y-6 p-5 sm:grid-cols-2 sm:p-6">
            <InfoBlock
              icon={AlertCircle}
              label="Kejadian Bencana"
              value={request.event_name}
              secondary={request.event_code}
            />

            <InfoBlock
              icon={MapPin}
              label="Posko Pemohon"
              value={
                request.requester_location_name
              }
              secondary={
                request.requester_location_address
              }
            />

            <InfoBlock
              icon={UserRound}
              label="Pemohon"
              value={request.submitted_by_name}
            />

            <InfoBlock
              icon={CalendarDays}
              label="Waktu Pengajuan"
              value={formatDate(
                request.requested_at
              )}
            />
          </div>

          <div className="border-t border-slate-200 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Alasan Permintaan
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {request.reason ||
                    "Tidak ada alasan yang diberikan."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Request summary */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
              <Package className="h-4 w-4" />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900">
                Ringkasan Kebutuhan
              </h2>

              <p className="text-xs text-slate-400">
                Total item yang diajukan
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <MetricRow
              label="Jenis bantuan"
              value={`${items.length} item`}
            />

            <MetricRow
              label="Total diminta"
              value={totalRequested.toLocaleString(
                "id-ID"
              )}
            />

            <MetricRow
              label="Total disetujui"
              value={
                canReview && decision === "APPROVED"
                  ? totalApproved.toLocaleString(
                      "id-ID"
                    )
                  : items
                      .reduce(
                        (sum, item) =>
                          sum +
                          Number(
                            item.approved_qty ?? 0
                          ),
                        0
                      )
                      .toLocaleString("id-ID")
              }
            />
          </div>

          {request.approved_at && (
            <div className="mt-6 rounded-xl bg-emerald-50 p-3.5">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />

                <div>
                  <p className="text-xs font-semibold text-emerald-800">
                    Permintaan disetujui
                  </p>

                  <p className="mt-0.5 text-xs text-emerald-700">
                    {formatDate(
                      request.approved_at
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Items */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Package className="h-4 w-4" />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900">
                Kebutuhan Bantuan
              </h2>

              <p className="text-xs text-slate-400">
                Rincian barang yang diminta
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-500">
            {items.length} jenis bantuan
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                  Item
                </th>

                <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-slate-400">
                  Diminta
                </th>

                <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-slate-400">
                  Disetujui
                </th>

                <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                  Status
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const itemConfig = statusConfig(
                  item.status
                );

                return (
                  <tr
                    key={item.id}
                    className="transition hover:bg-slate-50/50"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                          <Package className="h-4 w-4" />
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {item.item_name}
                          </p>

                          <p className="mt-0.5 font-mono text-xs text-slate-400">
                            {item.item_code}
                          </p>

                          {item.description && (
                            <p className="mt-1 max-w-md text-xs text-slate-400">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <span className="font-semibold text-slate-800">
                        {Number(
                          item.requested_qty
                        ).toLocaleString("id-ID")}
                      </span>

                      <span className="ml-1 text-xs text-slate-400">
                        {item.unit}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      {canReview &&
                      decision === "APPROVED" ? (
                        <div className="flex items-center justify-end gap-2">
                          <input
                            type="number"
                            min="0"
                            max={item.requested_qty}
                            step="0.01"
                            value={
                              approvedQty[
                                item.aid_item_id
                              ] ?? 0
                            }
                            onChange={(event) =>
                              updateApprovedQty(
                                item.aid_item_id,
                                event.target.value
                              )
                            }
                            className="h-9 w-24 rounded-lg border border-slate-200 bg-white px-2.5 text-right text-sm font-semibold text-slate-800 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                          />

                          <span className="text-xs text-slate-400">
                            {item.unit}
                          </span>
                        </div>
                      ) : (
                        <>
                          <span className="font-semibold text-slate-800">
                            {Number(
                              item.approved_qty ?? 0
                            ).toLocaleString("id-ID")}
                          </span>

                          <span className="ml-1 text-xs text-slate-400">
                            {item.unit}
                          </span>
                        </>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${itemConfig.className}`}
                      >
                        <itemConfig.icon className="h-3.5 w-3.5" />
                        {itemConfig.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {canReview &&
          decision === "APPROVED" && (
            <div className="border-t border-slate-200 bg-teal-50/50 px-5 py-3.5 sm:px-6">
              <div className="flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:justify-between">
                <span className="text-slate-500">
                  Total jumlah yang akan disetujui
                </span>

                <span className="font-bold text-teal-700">
                  {totalApproved.toLocaleString(
                    "id-ID"
                  )}{" "}
                  unit
                </span>
              </div>
            </div>
          )}
      </section>

      {/* Review */}
      {canReview && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                <ClipboardCheck className="h-4 w-4" />
              </div>

              <div>
                <h2 className="font-semibold text-slate-900">
                  Review Permintaan
                </h2>

                <p className="text-xs text-slate-400">
                  Tentukan keputusan dan berikan catatan.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-slate-800">
                Keputusan
              </label>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <DecisionButton
                  active={decision === "APPROVED"}
                  value="APPROVED"
                  label="Approve"
                  icon={Check}
                  onClick={() =>
                    setDecision("APPROVED")
                  }
                />

                <DecisionButton
                  active={decision === "REJECTED"}
                  value="REJECTED"
                  label="Reject"
                  icon={X}
                  onClick={() =>
                    setDecision("REJECTED")
                  }
                />

                <DecisionButton
                  active={
                    decision === "NEEDS_REVISION"
                  }
                  value="NEEDS_REVISION"
                  label="Revisi"
                  icon={Clock3}
                  onClick={() =>
                    setDecision("NEEDS_REVISION")
                  }
                />
              </div>

              <p className="mt-2 text-xs text-slate-400">
                Pilih keputusan berdasarkan hasil
                verifikasi permintaan.
              </p>
            </div>

            <div>
              <label
                htmlFor="review-note"
                className="text-sm font-semibold text-slate-800"
              >
                Catatan Review
              </label>

              <textarea
                id="review-note"
                value={note}
                onChange={(event) =>
                  setNote(event.target.value)
                }
                rows={5}
                placeholder="Tuliskan alasan, pertimbangan, atau instruksi terkait review..."
                className="mt-3 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
              />

              <p className="mt-1.5 text-right text-xs text-slate-400">
                {note.length} karakter
              </p>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={() => {
                setDecision("");
                setNote("");
              }}
              disabled={submitting}
              className="h-10 rounded-xl px-4 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
            >
              Reset
            </button>

            <button
              type="button"
              onClick={handleReview}
              disabled={
                submitting ||
                !decision ||
                !note.trim()
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Save className="h-4 w-4" />

              {submitting
                ? "Menyimpan..."
                : "Simpan Review"}
            </button>
          </div>
        </section>
      )}

      {/* Review history */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Clock3 className="h-4 w-4" />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900">
                Riwayat Review
              </h2>

              <p className="text-xs text-slate-400">
                Catatan keputusan yang telah dilakukan.
              </p>
            </div>
          </div>
        </div>

        {reviews.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
              <Clock3 className="h-5 w-5" />
            </div>

            <p className="mt-3 text-sm font-semibold text-slate-700">
              Belum ada review
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Riwayat review akan muncul setelah
              permintaan diproses.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {reviews.map((review) => {
              const reviewStatus =
                review.decision ===
                "NEEDS_REVISION"
                  ? statusConfig("UNDER_REVIEW")
                  : statusConfig(
                      review.decision
                    );

              const ReviewIcon =
                reviewStatus.icon;

              return (
                <div
                  key={review.id}
                  className="relative px-5 py-5 sm:px-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                        <UserRound className="h-4 w-4" />
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {review.reviewer_name}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-400">
                          {review.review_type}
                        </p>

                        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                          <CalendarDays className="h-3.5 w-3.5" />

                          {formatDate(
                            review.reviewed_at
                          )}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${reviewStatus.className}`}
                    >
                      <ReviewIcon className="h-3.5 w-3.5" />

                      {review.decision ===
                      "NEEDS_REVISION"
                        ? "Perlu Revisi"
                        : reviewStatus.label}
                    </span>
                  </div>

                  {review.note && (
                    <div className="mt-4 rounded-xl bg-slate-50 p-3.5 sm:ml-12">
                      <p className="text-sm leading-6 text-slate-600">
                        {review.note}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function InfoBlock({
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
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>

        <p className="mt-1.5 text-sm font-semibold text-slate-800">
          {value}
        </p>

        {secondary && (
          <p className="mt-1 text-xs leading-5 text-slate-400">
            {secondary}
          </p>
        )}
      </div>
    </div>
  );
}

function MetricRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-4 last:border-0 last:pb-0">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span className="text-sm font-bold text-slate-900">
        {value}
      </span>
    </div>
  );
}

function DecisionButton({
  active,
  value,
  label,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  value: string;
  label: string;
  icon: React.ElementType;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition",
        active
          ? value === "APPROVED"
            ? "border-emerald-300 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-100"
            : value === "REJECTED"
              ? "border-red-300 bg-red-50 text-red-700 ring-2 ring-red-100"
              : "border-amber-300 bg-amber-50 text-amber-700 ring-2 ring-amber-100"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
      ].join(" ")}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}