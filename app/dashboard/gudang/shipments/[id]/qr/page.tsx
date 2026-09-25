"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Package,
  QrCode,
  RefreshCw,
  Route,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { encryptQRPayload } from "@/lib/qr-crypto";

type ManifestItem = {
  shipment_item_id: number;
  name: string;
  code: string;
  quantity: number | string;
  unit: string;
};

type Manifest = {
  shipment: {
    id: number;
    code: string;
    request_code: string;
    status: string;
  };

  route: {
    from: {
      name: string;
    };
    to: {
      name: string;
    };
  };

  items: ManifestItem[];

  event_id?: number;
};

function formatNumber(value: number | string) {
  return Number(value).toLocaleString("id-ID");
}

function shipmentStatus(status: string) {
  switch (status) {
    case "READY":
      return {
        label: "Siap Dikirim",
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-700",
        icon: CheckCircle2,
      };

    case "IN_TRANSIT":
      return {
        label: "Dalam Perjalanan",
        className:
          "border-amber-200 bg-amber-50 text-amber-700",
        icon: Truck,
      };

    case "DELIVERED":
      return {
        label: "Terkirim",
        className:
          "border-blue-200 bg-blue-50 text-blue-700",
        icon: CheckCircle2,
      };

    case "PREPARING":
      return {
        label: "Persiapan",
        className:
          "border-slate-200 bg-slate-100 text-slate-600",
        icon: Clock3,
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

export default function ShipmentQRPage() {
  const params = useParams();
  const router = useRouter();

  const id = params.id as string;

  const [qrImage, setQrImage] = useState("");
  const [manifest, setManifest] =
    useState<Manifest | null>(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function generateQR() {
    try {
      setLoading(true);
      setError("");
      setQrImage("");

      const response = await fetch(
        `/api/shipments/${id}/qr`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Gagal mengambil manifest shipment."
        );
      }

      const eventId = String(
        data.manifest?.shipment?.event_id ??
          data.manifest?.event_id ??
          ""
      );

      if (!eventId) {
        throw new Error(
          "event_id tidak ditemukan pada manifest."
        );
      }

      const encryptedQR =
        await encryptQRPayload(
          eventId,
          data.manifest
        );

      console.log(
        "QR payload length:",
        encryptedQR.length
      );

      const image =
        await QRCode.toDataURL(
          encryptedQR,
          {
            width: 600,
            margin: 4,
            errorCorrectionLevel: "M",
          }
        );

      setManifest(data.manifest);
      setQrImage(image);
    } catch (err) {
      console.error(
        "Generate QR error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Gagal membuat QR shipment."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) {
      generateQR();
    }
  }, [id]);

  if (loading) {
    return <LoadingState />;
  }

  if (error || !manifest || !qrImage) {
    return (
      <main className="space-y-5">
        <Link
          href="/dashboard/gudang/shipments"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Shipment
        </Link>

        <section className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

            <div>
              <h2 className="text-sm font-bold text-red-800">
                QR Shipment tidak dapat dibuat
              </h2>

              <p className="mt-1 text-sm text-red-700">
                {error ||
                  "Manifest shipment tidak tersedia."}
              </p>

              <button
                type="button"
                onClick={generateQR}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
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

  const status = shipmentStatus(
    manifest.shipment.status
  );

  const StatusIcon = status.icon;

  return (
    <main className="space-y-6">
      {/* Header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/dashboard/gudang/shipments"
            className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Shipment
          </Link>

          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
              <QrCode className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                QR Shipment
              </h1>

              <p className="mt-0.5 font-mono text-xs font-semibold text-teal-700">
                {manifest.shipment.code}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={generateQR}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Generate Ulang
        </button>
      </section>

      {/* Main QR area */}
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* QR */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col items-center">
            <div className="mb-5 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />

              <p className="text-sm font-bold text-slate-800">
                QR Manifest Terverifikasi
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <img
                src={qrImage}
                alt={`QR Shipment ${manifest.shipment.code}`}
                className="h-auto w-[min(72vw,520px)]"
              />
            </div>

            <div className="mt-5 max-w-lg text-center">
              <p className="text-xs leading-5 text-slate-500">
                QR berisi manifest shipment yang
                telah dikompresi dan dienkripsi.
                Gunakan QR ini pada proses scan
                custody di sepanjang perjalanan.
              </p>
            </div>
          </div>
        </div>

        {/* Shipment summary */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Status Shipment
                </p>

                <p className="mt-1 font-mono text-sm font-semibold text-slate-800">
                  {manifest.shipment.code}
                </p>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${status.className}`}
              >
                <StatusIcon className="h-3.5 w-3.5" />
                {status.label}
              </span>
            </div>

            <div className="mt-5 space-y-4">
              <InfoRow
                label="Request"
                value={
                  manifest.shipment
                    .request_code
                }
              />

              <InfoRow
                label="Dari"
                value={manifest.route.from.name}
              />

              <InfoRow
                label="Ke"
                value={manifest.route.to.name}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-teal-100 bg-teal-50/60 p-5">
            <div className="flex items-start gap-3">
              <Route className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />

              <div>
                <p className="text-sm font-bold text-teal-900">
                  Alur Custody
                </p>

                <p className="mt-1 text-xs leading-5 text-teal-700">
                  QR ini digunakan untuk
                  mencatat perpindahan shipment
                  dari titik asal hingga tujuan.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </section>

      {/* Manifest */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-teal-600" />

            <h2 className="text-sm font-bold text-slate-900">
              Isi Paket
            </h2>
          </div>

          <p className="mt-1 text-xs text-slate-400">
            Manifest barang yang tercantum dalam
            shipment ini.
          </p>
        </div>

        {manifest.items?.length ? (
          <div className="divide-y divide-slate-100">
            {manifest.items.map((item) => (
              <div
                key={item.shipment_item_id}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800">
                    {item.name}
                  </p>

                  <p className="mt-0.5 font-mono text-xs text-slate-400">
                    {item.code}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="font-bold text-slate-900">
                    {formatNumber(item.quantity)}
                  </p>

                  <p className="text-xs text-slate-400">
                    {item.unit}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-10 text-center text-sm text-slate-400">
            Tidak ada item pada manifest.
          </div>
        )}
      </section>

      {/* Security note */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

          <div>
            <h2 className="text-sm font-bold text-slate-800">
              Informasi QR
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Payload QR tidak menampilkan data
              manifest dalam bentuk plaintext.
              Manifest dikompresi dan dienkripsi
              sebelum dikonversi menjadi QR.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-slate-700">
        {value}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <main className="space-y-6">
      <div className="space-y-3">
        <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
        <div className="h-7 w-56 animate-pulse rounded bg-slate-200" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="h-[620px] animate-pulse rounded-2xl bg-white" />

        <div className="space-y-4">
          <div className="h-64 animate-pulse rounded-2xl bg-white" />
          <div className="h-36 animate-pulse rounded-2xl bg-white" />
        </div>
      </div>

      <div className="h-64 animate-pulse rounded-2xl bg-white" />
    </main>
  );
}