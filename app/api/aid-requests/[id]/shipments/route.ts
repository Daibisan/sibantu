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
        message: "Tidak memiliki akses membuat shipment",
      },
      { status: 403 }
    );
  }

  const { id } = await context.params;

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // ==========================================
    // 1. LOCK REQUEST
    // ==========================================

    const requestResult = await client.query(
      `
      SELECT
        id,
        request_code,
        disaster_event_id,
        requester_location_id,
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
          message: "Request harus berstatus APPROVED",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // 2. CEK APAKAH SUDAH ADA SHIPMENT
    // ==========================================

    const existingShipment = await client.query(
      `
      SELECT
        id,
        shipment_code,
        status
      FROM shipments
      WHERE request_id = $1::bigint
      LIMIT 1
      `,
      [id]
    );

    if (existingShipment.rows.length > 0) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        {
          success: false,
          message: "Request ini sudah memiliki shipment",
          shipment: existingShipment.rows[0],
        },
        { status: 400 }
      );
    }

    // ==========================================
    // 3. AMBIL REQUEST ITEMS
    // ==========================================

    const itemsResult = await client.query(
      `
      SELECT
        id,
        aid_item_id,
        approved_qty,
        status
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

    // ==========================================
    // 4. GENERATE SHIPMENT CODE
    // ==========================================

    const shipmentCode = `SHP-${Date.now()}`;

    // ==========================================
    // 5. CREATE SHIPMENT
    // ==========================================

    const shipmentResult = await client.query(
      `
      INSERT INTO shipments (
        shipment_code,
        request_id,
        status
      )
      VALUES (
        $1,
        $2::bigint,
        'PREPARING'
      )
      RETURNING
        id,
        shipment_code,
        request_id,
        status,
        created_at
      `,
      [
        shipmentCode,
        id,
      ]
    );

    const shipment = shipmentResult.rows[0];

    const allocations = [];
    const shipmentItems = [];

    // ==========================================
    // 6. FEFO ALLOCATION
    // ==========================================

    for (const item of itemsResult.rows) {
      let remainingQty = Number(item.approved_qty);

      // Cari inventory warehouse pada event yang sama.
      // Urutan FEFO:
      // expired_at paling dekat → received_at paling lama
      const lotsResult = await client.query(
        `
        SELECT
          il.id,
          il.lot_code,
          il.on_hand_qty,
          il.reserved_qty,
          il.expired_at,
          il.received_at
        FROM inventory_lots il
        JOIN event_locations el
          ON el.id = il.event_location_id
        WHERE il.aid_item_id = $1::bigint
          AND el.disaster_event_id = $2::bigint
          AND el.type = 'WAREHOUSE'
          AND el.status = 'ACTIVE'
          AND il.status = 'AVAILABLE'
          AND (il.on_hand_qty - il.reserved_qty) > 0
        ORDER BY
          il.expired_at ASC NULLS LAST,
          il.received_at ASC,
          il.id ASC
        FOR UPDATE
        `,
        [
          item.aid_item_id,
          aidRequest.disaster_event_id,
        ]
      );

      if (lotsResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            message: `Stok untuk item ${item.aid_item_id} tidak tersedia`,
          },
          { status: 400 }
        );
      }

      let totalAllocated = 0;

      for (const lot of lotsResult.rows) {
        if (remainingQty <= 0) {
          break;
        }

        const availableQty =
          Number(lot.on_hand_qty) -
          Number(lot.reserved_qty);

        const allocatedQty = Math.min(
          remainingQty,
          availableQty
        );

        if (allocatedQty <= 0) {
          continue;
        }

        // ========================================
        // STOCK ALLOCATION
        // ========================================

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
            $2::bigint,
            $3::numeric,
            'ALLOCATED',
            NOW()
          )
          RETURNING id
          `,
          [
            lot.id,
            shipment.id,
            allocatedQty,
          ]
        );

        // ========================================
        // RESERVE STOCK
        // ========================================

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
        totalAllocated += allocatedQty;
      }

      // ========================================
      // STOK TIDAK CUKUP
      // ========================================

      if (remainingQty > 0) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            message: `Stok tidak cukup untuk item ${item.id}`,
            shortage_qty: remainingQty,
          },
          { status: 400 }
        );
      }

      // ========================================
      // CREATE SHIPMENT ITEM
      // ========================================

      const shipmentItemResult = await client.query(
        `
        INSERT INTO shipment_items (
          shipment_id,
          request_item_id,
          quantity,
          status
        )
        VALUES (
          $1::bigint,
          $2::bigint,
          $3::numeric,
          'READY'
        )
        RETURNING
          id,
          shipment_id,
          request_item_id,
          quantity,
          status
        `,
        [
          shipment.id,
          item.id,
          totalAllocated,
        ]
      );

      shipmentItems.push(
        shipmentItemResult.rows[0]
      );
    }

    // ==========================================
    // 7. UPDATE SHIPMENT
    // ==========================================

    await client.query(
      `
      UPDATE shipments
      SET status = 'READY'
      WHERE id = $1::bigint
      `,
      [shipment.id]
    );

    // ==========================================
    // 8. COMMIT
    // ==========================================

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      message: "Shipment berhasil dibuat dan stock berhasil dialokasikan",
      shipment: {
        id: shipment.id,
        shipment_code: shipment.shipment_code,
        request_id: shipment.request_id,
        status: "READY",
      },
      allocations,
      shipment_items: shipmentItems,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "Create shipment & allocation error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Gagal membuat shipment dan allocation",
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}