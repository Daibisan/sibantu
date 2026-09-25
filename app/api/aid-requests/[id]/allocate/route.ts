import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
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

  if (user.role.code !== "ADMIN" && user.role.code !== "GUDANG") {
    return NextResponse.json(
      {
        success: false,
        message: "Tidak memiliki akses untuk melakukan allocation",
      },
      { status: 403 }
    );
  }

  const { id } = await context.params;

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // 1. Lock request
    const requestResult = await client.query(
      `
      SELECT
        id,
        disaster_event_id,
        status
      FROM aid_requests
      WHERE id = $1::bigint
      FOR UPDATE
      `,
      [id]
    );

    if (requestResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        {
          success: false,
          message: "Request tidak ditemukan",
        },
        { status: 404 }
      );
    }

    const aidRequest = requestResult.rows[0];

    if (aidRequest.status !== "APPROVED") {
      await client.query("ROLLBACK");

      return NextResponse.json(
        {
          success: false,
          message: "Request harus berstatus APPROVED sebelum allocation",
        },
        { status: 400 }
      );
    }

    // 2. Ambil item request
    const itemsResult = await client.query(
      `
      SELECT
        id,
        aid_item_id,
        approved_qty
      FROM aid_request_items
      WHERE request_id = $1::bigint
        AND status IN ('APPROVED', 'PARTIALLY_APPROVED')
      ORDER BY id ASC
      `,
      [id]
    );

    if (itemsResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        {
          success: false,
          message: "Tidak ada item yang dapat dialokasikan",
        },
        { status: 400 }
      );
    }

    const allocations = [];

    // 3. FEFO allocation
    for (const item of itemsResult.rows) {
      let remainingQty = Number(item.approved_qty);

      const lotsResult = await client.query(
        `
        SELECT
          id,
          lot_code,
          on_hand_qty,
          reserved_qty,
          expired_at
        FROM inventory_lots
        WHERE aid_item_id = $1::bigint
          AND event_location_id IN (
            SELECT id
            FROM event_locations
            WHERE disaster_event_id = $2::bigint
              AND type = 'WAREHOUSE'
              AND status = 'ACTIVE'
          )
          AND status = 'AVAILABLE'
          AND (on_hand_qty - reserved_qty) > 0
        ORDER BY
          expired_at ASC NULLS LAST,
          received_at ASC,
          id ASC
        FOR UPDATE
        `,
        [
          item.aid_item_id,
          aidRequest.disaster_event_id,
        ]
      );

      for (const lot of lotsResult.rows) {
        if (remainingQty <= 0) {
          break;
        }

        const availableQty =
          Number(lot.on_hand_qty) - Number(lot.reserved_qty);

        const allocatedQty = Math.min(
          remainingQty,
          availableQty
        );

        if (allocatedQty <= 0) {
          continue;
        }

        // 4. Buat stock allocation
        const allocationResult = await client.query(
          `
          INSERT INTO stock_allocations (
            inventory_lot_id,
            shipment_id,
            allocated_qty,
            status,
            allocated_at
          )
          VALUES (
            $1::bigint,
            NULL,
            $2::numeric,
            'ALLOCATED',
            NOW()
          )
          RETURNING id
          `,
          [
            lot.id,
            allocatedQty,
          ]
        );

        // 5. Reserve stock
        await client.query(
          `
          UPDATE inventory_lots
          SET reserved_qty = reserved_qty + $1::numeric
          WHERE id = $2::bigint
          `,
          [
            allocatedQty,
            lot.id,
          ]
        );

        allocations.push({
          allocation_id: allocationResult.rows[0].id,
          request_item_id: item.id,
          inventory_lot_id: lot.id,
          lot_code: lot.lot_code,
          allocated_qty: allocatedQty,
          expired_at: lot.expired_at,
        });

        remainingQty -= allocatedQty;
      }

      // 6. Kalau stok tidak cukup
      if (remainingQty > 0) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            message: `Stok tidak cukup untuk request item ${item.id}`,
            shortage_qty: remainingQty,
          },
          { status: 400 }
        );
      }
    }

    // 7. Update request menjadi ALLOCATED
    await client.query(
      `
      UPDATE aid_requests
      SET status = 'FULFILLED'
      WHERE id = $1::bigint
      `,
      [id]
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      message: "Allocation berhasil",
      request_id: id,
      status: "FULFILLED",
      allocations,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Allocation error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal melakukan allocation",
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}