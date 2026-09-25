import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
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

    const result = await db.query(`
      SELECT
        ar.id,
        ar.request_code,
        ar.disaster_event_id,
        de.code AS event_code,
        de.name AS event_name,
        ar.requester_location_id,
        pl.name AS requester_location_name,
        ar.submitted_by,
        u.name AS submitted_by_name,
        ar.status,
        ar.reason,
        ar.requested_at,
        ar.approved_at,

        s.id AS shipment_id,
        s.shipment_code,
        s.status AS shipment_status

      FROM aid_requests ar

      JOIN disaster_events de
        ON de.id = ar.disaster_event_id

      JOIN event_locations el
        ON el.id = ar.requester_location_id

      JOIN physical_locations pl
        ON pl.id = el.physical_location_id

      JOIN users u
        ON u.id = ar.submitted_by

      LEFT JOIN shipments s
        ON s.request_id = ar.id

      ORDER BY ar.requested_at DESC
    `);

    return NextResponse.json({
      success: true,
      requests: result.rows,
    });
  } catch (error) {
    console.error("Get aid requests error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil data permintaan bantuan",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const client = await db.connect();

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

    if (user.role.code !== "PETUGAS_POSKO") {
      return NextResponse.json(
        {
          success: false,
          message: "Hanya petugas posko yang dapat membuat permintaan",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const {
      disaster_event_id,
      requester_location_id,
      reason,
      items,
    } = body;

    if (
      !disaster_event_id ||
      !requester_location_id ||
      !reason ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "disaster_event_id, requester_location_id, reason, dan items wajib diisi",
        },
        { status: 400 }
      );
    }

    await client.query("BEGIN");

    const eventResult = await client.query(
      `
      SELECT id
      FROM disaster_events
      WHERE id = $1
        AND status = 'ACTIVE'
      LIMIT 1
      `,
      [disaster_event_id]
    );

    if (eventResult.rowCount === 0) {
      throw new Error("Bencana tidak ditemukan atau tidak aktif");
    }

    const locationResult = await client.query(
      `
      SELECT id
      FROM event_locations
      WHERE id = $1
        AND disaster_event_id = $2
        AND status = 'ACTIVE'
      LIMIT 1
      `,
      [requester_location_id, disaster_event_id]
    );

    if (locationResult.rowCount === 0) {
      throw new Error(
        "Lokasi posko tidak valid untuk event bencana tersebut"
      );
    }

    const requestCode = `REQ-${Date.now()}`;

    const requestResult = await client.query(
      `
      INSERT INTO aid_requests (
        request_code,
        disaster_event_id,
        requester_location_id,
        submitted_by,
        status,
        reason
      )
      VALUES ($1, $2, $3, $4, 'PENDING', $5)
      RETURNING id, request_code, status, requested_at
      `,
      [
        requestCode,
        disaster_event_id,
        requester_location_id,
        user.id,
        reason.trim(),
      ]
    );

    const aidRequest = requestResult.rows[0];

    for (const item of items) {
      const aidItemId = Number(item.aid_item_id);
      const requestedQty = Number(item.requested_qty);

      if (
        !Number.isInteger(aidItemId) ||
        !Number.isFinite(requestedQty) ||
        requestedQty <= 0
      ) {
        throw new Error("Data item bantuan tidak valid");
      }

      const aidItemResult = await client.query(
        `
        SELECT id
        FROM aid_items
        WHERE id = $1
          AND is_active = true
        LIMIT 1
        `,
        [aidItemId]
      );

      if (aidItemResult.rowCount === 0) {
        throw new Error(
          `Item bantuan dengan ID ${aidItemId} tidak ditemukan`
        );
      }

      await client.query(
        `
        INSERT INTO aid_request_items (
          request_id,
          aid_item_id,
          requested_qty,
          approved_qty,
          status
        )
        VALUES ($1, $2, $3, 0, 'PENDING')
        `,
        [aidRequest.id, aidItemId, requestedQty]
      );
    }

    await client.query("COMMIT");

    return NextResponse.json(
      {
        success: true,
        message: "Permintaan bantuan berhasil dibuat",
        request: aidRequest,
      },
      { status: 201 }
    );
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Create aid request error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal membuat permintaan bantuan",
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}