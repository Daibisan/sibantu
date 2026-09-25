"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ElementType,
} from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileWarning,
  Hash,
  Loader2,
  MapPin,
  Package,
  QrCode,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Truck,
  X,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

import { decryptQRPayload } from "@/lib/qr-crypto";

/* ============================================================
 * DUMMY PETUGAS ASSIGNMENT
 * ============================================================ */

const DUMMY_OFFICER = {
  name: "Petugas Posko",
  event_location_id: 3,
  location_name: "Posko Lapangan Desa Sukamaju",
  location_type: "POSKO_LAPANGAN",
};

/*
 * Dummy lokasi keberangkatan.
 *
 * Karena backend mewajibkan scan pertama dilakukan
 * di lokasi FROM ketika shipment masih PENDING,
 * untuk sementara kita simulasi keberangkatan dari gudang.
 *
 * Nanti ketika officer_assignments / custody flow sudah
 * siap, bagian ini tidak diperlukan lagi.
 */
const DUMMY_DEPARTURE_LOCATION = {
  event_location_id: 1,
  location_name: "Gudang Utama BPBD",
  location_type: "WAREHOUSE",
};

/* ============================================================
 * TYPES
 * ============================================================ */

type QRManifest = {
  version?: number;

  shipment: {
    id: number;
    code: string;
    request_code: string;
    request_id: number;
    status: string;
    event_id: number;
  };

  qr: {
    id: number;
    public_token: string;
    status: string;
    generated_at?: string;
    revoked_at?: string | null;
  };

  leg: {
    id: number;
    sequence_no: number;
    status: string;
  };

  route: {
    from: {
      id: number;
      name: string;
    };

    to: {
      id: number;
      name: string;
    };
  };

  items: {
    shipment_item_id: number;
    request_item_id: number;
    code: string;
    name: string;
    quantity: number;
    unit: string;
    status: string;
  }[];

  issued_at?: string;
};

type ScanResponse = {
  success: boolean;
  message?: string;

  scan_type?:
    | "DEPARTURE"
    | "CHECKPOINT"
    | "ARRIVAL";

  location?: {
    id: number | string;
    name: string;
    type: string;
  };

  shipment?: {
    id: number | string;
    code: string;
    status: string;
  };

  leg?: {
    id: number | string;
    sequence_no: number;
    status: string;

    from_location?: {
      id: number | string;
      name: string;
    };

    to_location?: {
      id: number | string;
      name: string;
    };
  };

  scan_attempt?: {
    id: number | string;
  };

  validation?: {
    id: number | string;
    validation_status: string;
    reason: string;
  };
};

type ReceiptItem = {
  shipment_item_id: number;
  qty_good: number;
  qty_damaged: number;
  qty_rejected: number;
};

type ReceiptResponse = {
  success: boolean;
  message?: string;

  shipment?: {
    id: number | string;
    shipment_code: string;
    status: string;
  };

  receipt?: {
    id: number | string;
    status: string;
  };

  items?: unknown[];
};

type ScanStep =
  | "SCAN"
  | "MANIFEST"
  | "SCANNING"
  | "CONDITION"
  | "RECEIPT"
  | "REPORT"
  | "SUCCESS";

/* ============================================================
 * PAGE
 * ============================================================ */

export default function PoskoScanPage() {
  const scannerRef =
    useRef<Html5Qrcode | null>(null);

  const scannerStartedRef =
    useRef(false);

  const [step, setStep] =
    useState<ScanStep>("SCAN");

  const [manualPayload, setManualPayload] =
    useState("");

  const [manifest, setManifest] =
    useState<QRManifest | null>(null);

  const [scanResult, setScanResult] =
    useState<ScanResponse | null>(null);

  const [receiptItems, setReceiptItems] =
    useState<ReceiptItem[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [scannerError, setScannerError] =
    useState("");

  const [reportReason, setReportReason] =
    useState("");

  const [reportNote, setReportNote] =
    useState("");

  /* ==========================================================
   * CLEANUP
   * ========================================================== */

  async function stopScanner() {
    if (!scannerRef.current) {
      return;
    }

    try {
      if (scannerStartedRef.current) {
        await scannerRef.current.stop();
      }
    } catch {
      // Ignore scanner cleanup errors.
    }

    try {
      await scannerRef.current.clear();
    } catch {
      // Ignore scanner cleanup errors.
    }

    scannerStartedRef.current = false;
    scannerRef.current = null;
  }

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, []);

  /* ==========================================================
   * PROCESS QR
   * ========================================================== */

  async function processQRValue(
    rawValue: string
  ) {
    setError("");
    setScannerError("");
    setSuccessMessage("");

    const value = rawValue.trim();

    if (!value) {
      setError("QR kosong.");
      return;
    }

    try {
      const decoded =
        await decryptQRPayload(value);

      if (!decoded) {
        throw new Error(
          "Payload QR tidak dapat dibaca."
        );
      }

      if (
        !decoded?.shipment ||
        !decoded?.qr ||
        !decoded?.leg ||
        !decoded?.route
      ) {
        throw new Error(
          "QR berhasil didekripsi, tetapi manifest shipment tidak lengkap."
        );
      }

      /*
       * Normalisasi ID PostgreSQL BIGINT.
       */
      const parsedManifest: QRManifest = {
        ...decoded,

        shipment: {
          ...decoded.shipment,

          id: Number(
            decoded.shipment.id
          ),

          request_id: Number(
            decoded.shipment.request_id
          ),

          event_id: Number(
            decoded.shipment.event_id
          ),
        },

        qr: {
          ...decoded.qr,

          id: Number(
            decoded.qr.id
          ),
        },

        leg: {
          ...decoded.leg,

          id: Number(
            decoded.leg.id
          ),

          sequence_no: Number(
            decoded.leg.sequence_no
          ),
        },

        route: {
          from: {
            ...decoded.route.from,

            id: Number(
              decoded.route.from.id
            ),
          },

          to: {
            ...decoded.route.to,

            id: Number(
              decoded.route.to.id
            ),
          },
        },

        items: (
          decoded.items ?? []
        ).map(
          (item: any) => ({
            ...item,

            shipment_item_id:
              Number(
                item.shipment_item_id
              ),

            request_item_id:
              Number(
                item.request_item_id
              ),

            quantity:
              Number(
                item.quantity
              ),
          })
        ),
      };

      /*
       * QR harus ACTIVE.
       */
      if (
        parsedManifest.qr.status !==
        "ACTIVE"
      ) {
        throw new Error(
          "QR shipment sudah tidak aktif atau sudah digunakan."
        );
      }

      /*
       * Shipment selesai tidak boleh diproses lagi.
       */
      if (
        parsedManifest.shipment.status ===
          "DELIVERED" ||
        parsedManifest.shipment.status ===
          "CANCELLED"
      ) {
        throw new Error(
          `Shipment sudah berstatus ${parsedManifest.shipment.status}.`
        );
      }

      /*
       * Untuk sementara event/location assignment
       * masih dummy.
       */
      setManifest(
        parsedManifest
      );

      /*
       * Default seluruh barang GOOD.
       */
      setReceiptItems(
        parsedManifest.items.map(
          (item) => ({
            shipment_item_id:
              item.shipment_item_id,

            qty_good:
              item.quantity,

            qty_damaged: 0,

            qty_rejected: 0,
          })
        )
      );

      setStep("MANIFEST");
    } catch (err) {
      console.error(
        "Process QR error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "QR tidak dapat diproses."
      );

      setStep("SCAN");
    }
  }

  /* ==========================================================
   * START CAMERA
   * ========================================================== */

  async function startScanner() {
    setScannerError("");
    setError("");

    try {
      await stopScanner();

      const scanner =
        new Html5Qrcode(
          "shipment-qr-reader"
        );

      scannerRef.current =
        scanner;

      await scanner.start(
        {
          facingMode: "environment",
        },
        {
          fps: 10,

          qrbox: {
            width: 260,
            height: 260,
          },
        },

        async (decodedText) => {
          await stopScanner();

          await processQRValue(
            decodedText
          );
        },

        () => {
          // QR belum terbaca.
        }
      );

      scannerStartedRef.current =
        true;
    } catch (err) {
      console.error(
        "Start QR scanner error:",
        err
      );

      setScannerError(
        "Kamera tidak dapat digunakan. Pastikan izin kamera diberikan, atau gunakan input manual."
      );
    }
  }

  /* ==========================================================
   * MANUAL QR
   * ========================================================== */

  async function handleManualQR() {
    if (!manualPayload.trim()) {
      setError(
        "Masukkan payload QR terlebih dahulu."
      );

      return;
    }

    await processQRValue(
      manualPayload
    );
  }

  /* ==========================================================
   * POST SCAN HELPER
   * ========================================================== */

  async function submitScan({
    locationId,
    deviceTimeOffsetMs = 60_000,
  }: {
    locationId: number;
    deviceTimeOffsetMs?: number;
  }): Promise<ScanResponse> {
    if (!manifest) {
      throw new Error(
        "Manifest shipment belum tersedia."
      );
    }

    const clientEventId =
      crypto.randomUUID();

    const response =
      await fetch(
        `/api/shipments/${manifest.shipment.id}/scan`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            client_event_id:
              clientEventId,

            shipment_leg_id:
              manifest.leg.id,

            shipment_qr_id:
              manifest.qr.id,

            scanned_at_location_id:
              locationId,

            /*
             * Hindari device clock future
             * terhadap server.
             */
            device_scanned_at:
              new Date(
                Date.now() -
                  deviceTimeOffsetMs
              ).toISOString(),
          }),
        }
      );

    const data: ScanResponse =
      await response.json();

    if (
      !response.ok ||
      !data.success
    ) {
      throw new Error(
        data.message ||
          "Scan shipment gagal."
      );
    }

    return data;
  }

  /* ==========================================================
   * PROCESS SCAN
   * ========================================================== */

  async function handleScan() {
    if (!manifest) {
      return;
    }

    setLoading(true);
    setError("");
    setScanResult(null);

    try {
      setStep("SCANNING");

      /*
       * ======================================================
       * DUMMY FLOW
       * ======================================================
       *
       * User berada di Posko Lapangan.
       *
       * Tetapi jika shipment masih READY/PENDING,
       * backend mewajibkan scan pertama di lokasi FROM.
       *
       * Karena ini masih dummy:
       *
       *   1. Simulasikan DEPARTURE di Gudang.
       *   2. Simulasikan ARRIVAL di Posko.
       *
       * User cukup menekan satu tombol.
       *
       * Nanti ketika sistem custody/officer assignment
       * sudah benar-benar terintegrasi, flow ini tinggal
       * diganti dengan scan aktual.
       * ======================================================
       */

      const shipmentStatus =
        manifest.shipment.status;

      let arrivalResult:
        | ScanResponse
        | null = null;

      /*
       * ------------------------------------------------------
       * STEP 1 — DEPARTURE
       * ------------------------------------------------------
       *
       * Shipment READY/PENDING berarti belum berangkat.
       *
       * Scan pertama harus berada di route.from.
       *
       * Kita gunakan route.from dari manifest jika ID-nya
       * tersedia. Untuk demo shipment3:
       *
       * Gudang Utama BPBD = ID 1.
       */
      if (
        shipmentStatus ===
          "READY" ||
        manifest.leg.status ===
          "PENDING"
      ) {
        const departureLocationId =
          manifest.route.from.id;

        const departureResult =
          await submitScan({
            locationId:
              departureLocationId,
          });

        /*
         * Pastikan backend benar-benar menganggap
         * scan pertama sebagai DEPARTURE.
         */
        if (
          departureResult.scan_type !==
          "DEPARTURE"
        ) {
          throw new Error(
            "Shipment belum dapat diberangkatkan. Scan pertama harus dilakukan di lokasi keberangkatan."
          );
        }

        /*
         * Sedikit jeda agar status UI terasa
         * seperti proses operasional.
         */
        await new Promise(
          (resolve) =>
            setTimeout(resolve, 250)
        );
      }

      /*
       * ------------------------------------------------------
       * STEP 2 — ARRIVAL
       * ------------------------------------------------------
       *
       * Setelah departure berhasil, simulasi scan
       * kedatangan di lokasi petugas.
       *
       * Untuk demo:
       *
       * Posko Lapangan Desa Sukamaju = ID 3.
       */
      const arrivalLocationId =
        Number(manifest.route?.to?.id ?? DUMMY_OFFICER.event_location_id);

      arrivalResult =
        await submitScan({
          locationId:
            arrivalLocationId,
        });

      setScanResult(
        arrivalResult
      );

      /*
       * ------------------------------------------------------
       * STEP 3 — CONDITION
       * ------------------------------------------------------
       *
       * Ini bagian penting:
       *
       * Barang Sesuai
       * Barang Tidak Sesuai
       *
       * sekarang pasti muncul setelah ARRIVAL.
       */
      if (
        arrivalResult.scan_type ===
        "ARRIVAL"
      ) {
        setStep("CONDITION");
      } else {
        /*
         * Jika dummy route ternyata bukan arrival,
         * tetap tampilkan status scan.
         */
        setSuccessMessage(
          arrivalResult.scan_type ===
            "DEPARTURE"
            ? "Keberangkatan shipment berhasil dicatat."
            : "Checkpoint shipment berhasil dicatat."
        );

        setStep("SUCCESS");
      }
    } catch (err) {
      console.error(
        "Process shipment scan error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Gagal memproses scan shipment."
      );

      setStep("MANIFEST");
    } finally {
      setLoading(false);
    }
  }

  /* ==========================================================
   * RECEIPT ITEM UPDATE
   * ========================================================== */

  function updateReceiptItem(
    shipmentItemId: number,
    field:
      | "qty_good"
      | "qty_damaged"
      | "qty_rejected",
    value: number
  ) {
    setReceiptItems(
      (current) =>
        current.map((item) =>
          item.shipment_item_id ===
          shipmentItemId
            ? {
                ...item,

                [field]:
                  Math.max(
                    0,
                    Number.isFinite(
                      value
                    )
                      ? value
                      : 0
                  ),
              }
            : item
        )
    );
  }

  /* ==========================================================
   * RECEIPT VALIDATION
   * ========================================================== */

  const receiptValidation =
    useMemo(() => {
      if (!manifest) {
        return {
          valid: false,
          totalReceived: 0,
        };
      }

      let valid = true;
      let totalReceived = 0;

      for (
        const shipmentItem of
          manifest.items
      ) {
        const receipt =
          receiptItems.find(
            (item) =>
              item.shipment_item_id ===
              shipmentItem.shipment_item_id
          );

        if (!receipt) {
          valid = false;
          continue;
        }

        const total =
          receipt.qty_good +
          receipt.qty_damaged +
          receipt.qty_rejected;

        totalReceived += total;

        if (
          total !==
          shipmentItem.quantity
        ) {
          valid = false;
        }
      }

      return {
        valid,
        totalReceived,
      };
    }, [
      manifest,
      receiptItems,
    ]);

  /* ==========================================================
   * GO TO RECEIPT
   * ========================================================== */

  function handleGoodsMatch() {
    setError("");
    setStep("RECEIPT");
  }

  /* ==========================================================
   * OPEN REPORT
   * ========================================================== */

  function handleGoodsMismatch() {
    setError("");
    setReportReason("");
    setReportNote("");
    setStep("REPORT");
  }

  /* ==========================================================
   * DUMMY REPORT
   * ========================================================== */

  async function handleReportSubmit() {
    if (!manifest || !scanResult) {
      return;
    }

    if (!reportReason) {
      setError(
        "Pilih alasan ketidaksesuaian."
      );

      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/shipments/${manifest.shipment.id}/dispute`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: reportReason,
            note: reportNote,
            scan_attempt_id: scanResult?.scan_attempt?.id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Gagal mencatat laporan ketidaksesuaian."
        );
      }

      setSuccessMessage(
        data.message ||
          "Laporan ketidaksesuaian berhasil dicatat dan diteruskan untuk verifikasi BPBD."
      );

      setStep("SUCCESS");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengirim laporan ketidaksesuaian."
      );
    } finally {
      setLoading(false);
    }
  }

  /* ==========================================================
   * SUBMIT RECEIPT
   * ========================================================== */

  async function handleReceipt() {
    if (!manifest || !scanResult) {
      return;
    }

    if (
      scanResult.scan_type !==
      "ARRIVAL"
    ) {
      return;
    }

    if (
      !receiptValidation.valid
    ) {
      setError(
        "Jumlah penerimaan setiap item harus sama persis dengan jumlah shipment."
      );

      return;
    }

    if (
      !scanResult.scan_attempt?.id
    ) {
      setError(
        "Scan attempt tidak ditemukan."
      );

      return;
    }

    setLoading(true);
    setError("");

    try {
      const response =
        await fetch(
          `/api/shipments/${manifest.shipment.id}/receipt`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              scan_attempt_id:
                Number(
                  scanResult
                    .scan_attempt.id
                ),

              shipment_leg_id:
                Number(
                  manifest.leg.id
                ),

              received_at_location_id:
                Number(
                  manifest.route?.to?.id ??
                    DUMMY_OFFICER.event_location_id
                ),

              items: receiptItems,
            }),
          }
        );

      const data: ReceiptResponse =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Penerimaan shipment gagal."
        );
      }

      setSuccessMessage(
        data.message ||
          "Penerimaan shipment berhasil dicatat."
      );

      setStep("SUCCESS");
    } catch (err) {
      console.error(
        "Create receipt error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Gagal mencatat penerimaan shipment."
      );
    } finally {
      setLoading(false);
    }
  }

  /* ==========================================================
   * RESET
   * ========================================================== */

  async function resetFlow() {
    await stopScanner();

    setStep("SCAN");

    setManifest(null);

    setScanResult(null);

    setReceiptItems([]);

    setManualPayload("");

    setError("");

    setSuccessMessage("");

    setScannerError("");

    setReportReason("");

    setReportNote("");
  }

  /* ==========================================================
   * RENDER
   * ========================================================== */

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <ScanLine className="h-5 w-5" />
            </div>

            <span className="text-xs font-bold uppercase tracking-widest text-teal-600">
              Operasional Posko
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Scan & Penerimaan
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Verifikasi shipment bantuan dan
            catat penerimaan dari posko.
          </p>
        </div>

        {step !== "SCAN" && (
          <button
            type="button"
            onClick={resetFlow}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Scan Shipment Lain
          </button>
        )}
      </div>

      {/* CURRENT LOCATION */}

      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
          <MapPin className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Lokasi Petugas
          </p>

          <p className="truncate text-sm font-bold text-slate-800">
            {DUMMY_OFFICER.location_name}
          </p>
        </div>

        <div className="hidden shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 sm:flex">
          <Check className="h-3.5 w-3.5" />
          Assignment aktif
        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

          <div className="flex-1">
            <p className="font-semibold">
              Proses gagal
            </p>

            <p className="mt-0.5">
              {error}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setError("")}
            className="text-red-400 transition hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* SUCCESS */}

      {step === "SUCCESS" && (
        <SuccessPanel
          manifest={manifest}
          scanResult={scanResult}
          message={successMessage}
          onReset={resetFlow}
        />
      )}

      {/* SCAN SCREEN */}

      {step === "SCAN" && (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          {/* CAMERA */}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                  <QrCode className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-bold text-slate-900">
                    Scan QR Shipment
                  </h2>

                  <p className="text-xs text-slate-500">
                    Arahkan kamera ke QR pada
                    paket.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
                <div
                  id="shipment-qr-reader"
                  className="min-h-[320px]"
                />
              </div>

              {scannerError && (
                <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-700">
                  {scannerError}
                </div>
              )}

              <button
                type="button"
                onClick={startScanner}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-teal-700"
              >
                <ScanLine className="h-4 w-4" />
                Aktifkan Kamera
              </button>
            </div>
          </div>

          {/* MANUAL */}

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-bold text-slate-900">
                Input Manual
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Gunakan jika kamera tidak tersedia.
              </p>
            </div>

            <div className="space-y-4 p-5">
              <textarea
                value={manualPayload}
                onChange={(event) =>
                  setManualPayload(
                    event.target.value
                  )
                }
                placeholder="SIB1.EVENT_ID.PAYLOAD..."
                rows={8}
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-50"
              />

              <button
                type="button"
                onClick={handleManualQR}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-bold text-teal-700 transition hover:bg-teal-100"
              >
                <ArrowRight className="h-4 w-4" />
                Proses QR
              </button>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex gap-3">
                  <ShieldCheck className="h-5 w-5 shrink-0 text-teal-600" />

                  <div>
                    <p className="text-xs font-bold text-slate-700">
                      Verifikasi otomatis
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      QR akan didekripsi dan
                      divalidasi sebelum shipment
                      dapat diproses.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MANIFEST */}

      {(step === "MANIFEST" ||
        step === "SCANNING") &&
        manifest && (
          <ManifestPanel
            manifest={manifest}
            officerLocation={
              DUMMY_OFFICER.location_name
            }
            onScan={handleScan}
            loading={loading}
          />
        )}

      {/* CONDITION */}

      {step === "CONDITION" &&
        manifest &&
        scanResult && (
          <ConditionPanel
            manifest={manifest}
            locationName={
              DUMMY_OFFICER.location_name
            }
            onMatch={
              handleGoodsMatch
            }
            onMismatch={
              handleGoodsMismatch
            }
          />
        )}

      {/* RECEIPT */}

      {step === "RECEIPT" &&
        manifest &&
        scanResult && (
          <ReceiptPanel
            manifest={manifest}
            scanResult={scanResult}
            receiptItems={
              receiptItems
            }
            updateReceiptItem={
              updateReceiptItem
            }
            valid={
              receiptValidation.valid
            }
            loading={loading}
            onSubmit={handleReceipt}
          />
        )}

      {/* REPORT */}

      {step === "REPORT" &&
        manifest &&
        scanResult && (
          <ReportPanel
            manifest={manifest}
            reason={reportReason}
            note={reportNote}
            setReason={
              setReportReason
            }
            setNote={setReportNote}
            loading={loading}
            onSubmit={
              handleReportSubmit
            }
          />
        )}
    </div>
  );
}

/* ============================================================
 * MANIFEST PANEL
 * ============================================================ */

function ManifestPanel({
  manifest,
  officerLocation,
  onScan,
  loading,
}: {
  manifest: QRManifest;
  officerLocation: string;
  onScan: () => void;
  loading: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-teal-600 shadow-sm">
              <CheckCircle2 className="h-6 w-6" />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-teal-600">
                QR Teridentifikasi
              </p>

              <h2 className="mt-0.5 text-lg font-bold text-slate-900">
                {manifest.shipment.code}
              </h2>
            </div>
          </div>

          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700">
            <Check className="h-3.5 w-3.5" />
            QR ACTIVE
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-slate-900">
            Identifikasi Shipment
          </h2>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCard
            icon={Hash}
            label="Shipment"
            value={
              manifest.shipment.code
            }
          />

          <InfoCard
            icon={ClipboardCheck}
            label="Request"
            value={
              manifest.shipment
                .request_code
            }
          />

          <InfoCard
            icon={Truck}
            label="Status"
            value={
              manifest.shipment.status
            }
          />

          <InfoCard
            icon={QrCode}
            label="QR ID"
            value={String(
              manifest.qr.id
            )}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-teal-600" />

          <h2 className="font-bold text-slate-900">
            Rute Shipment
          </h2>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <RouteBox
            label="Asal"
            name={
              manifest.route.from.name
            }
          />

          <ArrowRight className="hidden h-5 w-5 shrink-0 text-slate-300 sm:block" />

          <ArrowDown className="h-5 w-5 self-center text-slate-300 sm:hidden" />

          <RouteBox
            label="Tujuan"
            name={
              manifest.route.to.name
            }
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-teal-600" />

            <h2 className="font-bold text-slate-900">
              Isi Shipment
            </h2>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {manifest.items.map(
            (item) => (
              <div
                key={
                  item.shipment_item_id
                }
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-800">
                    {item.name}
                  </p>

                  <p className="mt-0.5 text-xs text-slate-400">
                    {item.code}
                  </p>
                </div>

                <p className="shrink-0 text-sm font-bold text-slate-900">
                  {item.quantity}{" "}
                  {item.unit}
                </p>
              </div>
            )
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
            <MapPin className="h-5 w-5" />
          </div>

          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Lokasi Scan
            </p>

            <p className="mt-1 text-sm font-bold text-slate-900">
              {officerLocation}
            </p>

            <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600">
              <Check className="h-3.5 w-3.5" />

              <span>
                Lokasi berasal dari assignment
                petugas
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onScan}
          disabled={loading}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Memvalidasi Shipment...
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" />
              Validasi & Proses Shipment
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
 * CONDITION PANEL
 * ============================================================ */

function ConditionPanel({
  manifest,
  locationName,
  onMatch,
  onMismatch,
}: {
  manifest: QRManifest;
  locationName: string;
  onMatch: () => void;
  onMismatch: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
            <CheckCircle2 className="h-6 w-6" />
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Shipment Tiba
            </p>

            <h2 className="mt-1 text-lg font-bold text-slate-900">
              {manifest.shipment.code}
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Scan kedatangan berhasil
              dicatat di {locationName}.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <ClipboardCheck className="h-6 w-6" />
          </div>

          <h2 className="mt-4 text-xl font-bold text-slate-900">
            Apakah barang sesuai?
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Periksa jumlah, jenis barang,
            dan kondisi paket sebelum
            mengonfirmasi penerimaan.
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onMatch}
            className="group rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-left transition hover:border-emerald-300 hover:bg-emerald-100"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
              <CheckCircle2 className="h-6 w-6" />
            </div>

            <p className="mt-4 font-bold text-slate-900">
              Barang Sesuai
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Lanjutkan ke konfirmasi jumlah
              barang yang diterima.
            </p>
          </button>

          <button
            type="button"
            onClick={onMismatch}
            className="group rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left transition hover:border-amber-300 hover:bg-amber-100"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm">
              <FileWarning className="h-6 w-6" />
            </div>

            <p className="mt-4 font-bold text-slate-900">
              Barang Tidak Sesuai
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Laporkan perbedaan kepada BPBD
              untuk diverifikasi.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * RECEIPT PANEL
 * ============================================================ */

function ReceiptPanel({
  manifest,
  scanResult,
  receiptItems,
  updateReceiptItem,
  valid,
  loading,
  onSubmit,
}: {
  manifest: QRManifest;
  scanResult: ScanResponse;
  receiptItems: ReceiptItem[];
  updateReceiptItem: (
    shipmentItemId: number,
    field:
      | "qty_good"
      | "qty_damaged"
      | "qty_rejected",
    value: number
  ) => void;
  valid: boolean;
  loading: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
            <CheckCircle2 className="h-6 w-6" />
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Barang Sesuai
            </p>

            <h2 className="mt-1 text-lg font-bold text-slate-900">
              Konfirmasi Penerimaan
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Catat jumlah barang yang diterima,
              rusak, atau ditolak.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-slate-900">
                Detail Penerimaan
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Total setiap item harus sama
                dengan jumlah shipment.
              </p>
            </div>

            <span
              className={[
                "rounded-full px-3 py-1.5 text-xs font-bold",
                valid
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700",
              ].join(" ")}
            >
              {valid
                ? "Data Valid"
                : "Perlu Dicek"}
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {manifest.items.map(
            (shipmentItem) => {
              const receipt =
                receiptItems.find(
                  (item) =>
                    item.shipment_item_id ===
                    shipmentItem.shipment_item_id
                );

              if (!receipt) {
                return null;
              }

              const total =
                receipt.qty_good +
                receipt.qty_damaged +
                receipt.qty_rejected;

              const itemValid =
                total ===
                shipmentItem.quantity;

              return (
                <div
                  key={
                    shipmentItem.shipment_item_id
                  }
                  className="p-5"
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {shipmentItem.name}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-400">
                        {shipmentItem.code}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-slate-400">
                        Shipment
                      </p>

                      <p className="text-sm font-bold text-slate-900">
                        {shipmentItem.quantity}{" "}
                        {shipmentItem.unit}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <QuantityInput
                      label="Baik"
                      value={
                        receipt.qty_good
                      }
                      onChange={(value) =>
                        updateReceiptItem(
                          shipmentItem.shipment_item_id,
                          "qty_good",
                          value
                        )
                      }
                    />

                    <QuantityInput
                      label="Rusak"
                      value={
                        receipt.qty_damaged
                      }
                      onChange={(value) =>
                        updateReceiptItem(
                          shipmentItem.shipment_item_id,
                          "qty_damaged",
                          value
                        )
                      }
                    />

                    <QuantityInput
                      label="Ditolak"
                      value={
                        receipt.qty_rejected
                      }
                      onChange={(value) =>
                        updateReceiptItem(
                          shipmentItem.shipment_item_id,
                          "qty_rejected",
                          value
                        )
                      }
                    />
                  </div>

                  <div
                    className={[
                      "mt-3 flex items-center justify-between rounded-lg px-3 py-2 text-xs",
                      itemValid
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700",
                    ].join(" ")}
                  >
                    <span>
                      Total dicatat
                    </span>

                    <span className="font-bold">
                      {total} /{" "}
                      {shipmentItem.quantity}{" "}
                      {shipmentItem.unit}
                    </span>
                  </div>
                </div>
              );
            }
          )}
        </div>

        <div className="border-t border-slate-100 bg-slate-50 p-5">
          <button
            type="button"
            onClick={onSubmit}
            disabled={
              loading || !valid
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Menyimpan Penerimaan...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Konfirmasi Penerimaan
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * REPORT PANEL
 * ============================================================ */

function ReportPanel({
  manifest,
  reason,
  note,
  setReason,
  setNote,
  loading,
  onSubmit,
}: {
  manifest: QRManifest;
  reason: string;
  note: string;
  setReason: (
    value: string
  ) => void;
  setNote: (
    value: string
  ) => void;
  loading: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm">
            <FileWarning className="h-6 w-6" />
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-600">
              Laporan Ketidaksesuaian
            </p>

            <h2 className="mt-1 text-lg font-bold text-slate-900">
              Barang Tidak Sesuai
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              {manifest.shipment.code}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <label className="text-sm font-bold text-slate-800">
            Alasan ketidaksesuaian
          </label>

          <select
            value={reason}
            onChange={(event) =>
              setReason(
                event.target.value
              )
            }
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-50"
          >
            <option value="">
              Pilih alasan...
            </option>

            <option value="QUANTITY_LESS">
              Jumlah barang kurang
            </option>

            <option value="DAMAGED">
              Barang rusak
            </option>

            <option value="WRONG_ITEM">
              Jenis barang berbeda
            </option>

            <option value="SEAL_PROBLEM">
              Segel bermasalah
            </option>

            <option value="NOT_REQUESTED">
              Barang tidak sesuai request
            </option>

            <option value="OTHER">
              Lainnya
            </option>
          </select>
        </div>

        <div className="mt-5">
          <label className="text-sm font-bold text-slate-800">
            Catatan
            <span className="ml-1 font-normal text-slate-400">
              (opsional)
            </span>
          </label>

          <textarea
            value={note}
            onChange={(event) =>
              setNote(
                event.target.value
              )
            }
            rows={5}
            placeholder="Jelaskan ketidaksesuaian yang ditemukan..."
            className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-50"
          />
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex gap-3">
            <ShieldCheck className="h-5 w-5 shrink-0 text-teal-600" />

            <div>
              <p className="text-xs font-bold text-slate-700">
                Status shipment
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Shipment tidak akan dianggap
                diterima sampai laporan ini
                diverifikasi oleh BPBD.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={
            loading || !reason
          }
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Mengirim Laporan...
            </>
          ) : (
            <>
              <FileWarning className="h-4 w-4" />
              Laporkan ke BPBD
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
 * SUCCESS PANEL
 * ============================================================ */

function SuccessPanel({
  manifest,
  scanResult,
  message,
  onReset,
}: {
  manifest: QRManifest | null;
  scanResult: ScanResponse | null;
  message: string;
  onReset: () => void;
}) {
  const isArrival =
    scanResult?.scan_type ===
    "ARRIVAL";

  const isReport =
    Boolean(
      message &&
        message
          .toLowerCase()
          .includes("laporan")
    );

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-8 w-8" />
        </div>

        <p className="mt-5 text-xs font-bold uppercase tracking-widest text-emerald-600">
          Berhasil
        </p>

        <h2 className="mt-1 text-2xl font-bold text-slate-900">
          {isReport
            ? "Laporan Terkirim"
            : isArrival
              ? "Shipment Diterima"
              : "Scan Berhasil"}
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          {message ||
            "Proses shipment berhasil dicatat."}
        </p>
      </div>

      {manifest && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <InfoCard
            icon={Truck}
            label="Shipment"
            value={
              manifest.shipment.code
            }
          />

          <InfoCard
            icon={MapPin}
            label="Lokasi"
            value={
              DUMMY_OFFICER.location_name
            }
          />

          <InfoCard
            icon={ShieldCheck}
            label="QR"
            value={
              isArrival
                ? "REVOKED"
                : manifest.qr.status
            }
          />

          <InfoCard
            icon={ClipboardCheck}
            label="Status"
            value={
              isReport
                ? "VERIFICATION REVIEW"
                : isArrival
                  ? "DELIVERED"
                  : scanResult
                      ?.shipment
                      ?.status ??
                    manifest.shipment
                      .status
            }
          />
        </div>
      )}

      <button
        type="button"
        onClick={onReset}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-teal-700"
      >
        <ScanLine className="h-4 w-4" />
        Scan Shipment Lain
      </button>
    </div>
  );
}

/* ============================================================
 * INFO CARD
 * ============================================================ */

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-teal-600" />

        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </span>
      </div>

      <p className="mt-2 truncate text-sm font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
}

/* ============================================================
 * ROUTE BOX
 * ============================================================ */

function RouteBox({
  label,
  name,
}: {
  label: string;
  name: string;
}) {
  return (
    <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-slate-800">
        {name}
      </p>
    </div>
  );
}

/* ============================================================
 * QUANTITY INPUT
 * ============================================================ */

function QuantityInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (
    value: number
  ) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-600">
        {label}
      </span>

      <input
        type="number"
        min={0}
        step="any"
        value={value}
        onChange={(event) =>
          onChange(
            Number(
              event.target.value
            )
          )
        }
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-50"
      />
    </label>
  );
}