import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: Request,
  { params }: Params
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Belum login",
        },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!/^\d+$/.test(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "ID shipment tidak valid.",
        },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { reason, note, scan_attempt_id } = body;

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Alasan dispute/ketidaksesuaian wajib diisi.",
        },
        { status: 400 }
      );
    }

    // Pastikan shipment ada
    const shipmentResult = await db.query(
      `SELECT id, status FROM shipments WHERE id = $1::bigint LIMIT 1`,
      [id]
    );

    if (shipmentResult.rowCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Shipment tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    // Catat ke scan_validations jika ada scan_attempt_id, atau simpan catatan audit
    if (scan_attempt_id && Number.isInteger(Number(scan_attempt_id))) {
      await db.query(
        `
        INSERT INTO scan_validations (
          scan_attempt_id,
          validation_status,
          reason,
          validated_at
        )
        VALUES ($1::bigint, 'DISPUTED', $2, NOW())
        ON CONFLICT DO NOTHING
        `,
        [scan_attempt_id, `${reason.trim()}: ${note?.trim() || ""}`]
      );
    }

    return NextResponse.json({
      success: true,
      message: "Laporan ketidaksesuaian berhasil dicatat dan diteruskan ke posko/BPBD.",
      shipment_id: Number(id),
      reason: reason.trim(),
      note: note?.trim() || null,
      reported_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("POST /api/shipments/[id]/dispute error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal mencatat laporan dispute.",
      },
      { status: 500 }
    );
  }
}
