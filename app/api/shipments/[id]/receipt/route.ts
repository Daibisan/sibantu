import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
  const client = await db.connect();

  try {
    // =========================
    // AUTH
    // =========================

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

    const allowedRoles = [
      "ADMIN",
      "PETUGAS_POSKO",
    ];

    if (!allowedRoles.includes(user.role.code)) {
      return NextResponse.json(
        {
          success: false,
          message: "Tidak memiliki akses",
        },
        { status: 403 }
      );
    }

    // =========================
    // PARAMETER
    // =========================

    const { id } = await params;

    const body = await request.json();

    const {
      scan_attempt_id,
      shipment_leg_id,
      received_at_location_id,
      items,
    } = body;

    // =========================
    // VALIDASI INPUT
    // =========================

    if (!scan_attempt_id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "scan_attempt_id wajib diisi. Receipt harus berasal dari scan QR yang valid.",
        },
        { status: 400 }
      );
    }

    if (!shipment_leg_id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "shipment_leg_id wajib diisi.",
        },
        { status: 400 }
      );
    }

    if (!received_at_location_id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "received_at_location_id wajib diisi.",
        },
        { status: 400 }
      );
    }

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Item penerimaan wajib diisi.",
        },
        { status: 400 }
      );
    }

    // =========================
    // BEGIN TRANSACTION
    // =========================

    await client.query("BEGIN");

    // =========================
    // LOCK SHIPMENT
    // =========================

    const shipmentResult =
      await client.query(
        `
        SELECT
          s.id,
          s.shipment_code,
          s.request_id,
          s.status,
          ar.disaster_event_id
        FROM shipments s
        JOIN aid_requests ar
          ON ar.id = s.request_id
        WHERE s.id = $1::bigint
        FOR UPDATE
        `,
        [id]
      );

    if (
      shipmentResult.rows.length === 0
    ) {
      throw new Error(
        "Shipment tidak ditemukan."
      );
    }

    const shipment =
      shipmentResult.rows[0];

    // =========================
    // VALIDATE SHIPMENT STATUS
    // =========================

    if (shipment.status !== "IN_TRANSIT") {
      throw new Error(
        `Shipment belum dapat diterima karena status saat ini ${shipment.status}.`
      );
    }

    // =========================
    // LOCK & VALIDATE LEG
    // =========================

    const legResult =
      await client.query(
        `
        SELECT
          sl.id,
          sl.shipment_id,
          sl.sequence_no,
          sl.from_event_location_id,
          sl.to_event_location_id,
          sl.status
        FROM shipment_legs sl
        WHERE
          sl.id = $1::bigint
          AND sl.shipment_id = $2::bigint
        FOR UPDATE
        `,
        [
          shipment_leg_id,
          id,
        ]
      );

    if (
      legResult.rows.length === 0
    ) {
      throw new Error(
        "Shipment leg tidak ditemukan."
      );
    }

    const leg =
      legResult.rows[0];

    // Receipt hanya boleh setelah
    // scan ARRIVAL mengubah leg menjadi ARRIVED.
    if (leg.status !== "ARRIVED") {
      throw new Error(
        "Shipment belum sampai di lokasi tujuan. Lakukan scan kedatangan terlebih dahulu."
      );
    }

    // =========================
    // VALIDATE RECEIPT LOCATION
    // =========================

    const locationResult =
      await client.query(
        `
        SELECT
          el.id,
          el.disaster_event_id,
          el.status,
          el.type,
          pl.name AS location_name
        FROM event_locations el
        JOIN physical_locations pl
          ON pl.id = el.physical_location_id
        WHERE el.id = $1::bigint
        `,
        [received_at_location_id]
      );

    if (
      locationResult.rows.length === 0
    ) {
      throw new Error(
        "Lokasi penerimaan tidak ditemukan."
      );
    }

    const receiptLocation =
      locationResult.rows[0];

    // Harus berada di event yang sama.
    if (
      String(
        receiptLocation.disaster_event_id
      ) !==
      String(
        shipment.disaster_event_id
      )
    ) {
      throw new Error(
        "Lokasi penerimaan berada pada event bencana yang berbeda."
      );
    }

    if (
      receiptLocation.status !==
      "ACTIVE"
    ) {
      throw new Error(
        "Lokasi penerimaan tidak aktif."
      );
    }

    // Untuk final receipt, lokasi harus
    // merupakan tujuan akhir leg.
    if (
      String(received_at_location_id) !==
      String(leg.to_event_location_id)
    ) {
      throw new Error(
        "Lokasi penerimaan tidak sesuai dengan tujuan akhir shipment."
      );
    }

    // =========================
    // VALIDATE SCAN
    // =========================

    const scanResult =
      await client.query(
        `
        SELECT
          sa.id,
          sa.shipment_qr_id,
          sa.shipment_leg_id,
          sa.scanned_by,
          sa.scanned_at_location_id,
          sa.result,
          sv.validation_status
        FROM scan_attempts sa
        JOIN scan_validations sv
          ON sv.scan_attempt_id = sa.id
        WHERE sa.id = $1::bigint
        FOR UPDATE
        `,
        [scan_attempt_id]
      );

    if (
      scanResult.rows.length === 0
    ) {
      throw new Error(
        "Scan attempt tidak ditemukan."
      );
    }

    const scan =
      scanResult.rows[0];

    // Scan harus berasal dari leg
    // yang sedang diterima.
    if (
      String(scan.shipment_leg_id) !==
      String(shipment_leg_id)
    ) {
      throw new Error(
        "Scan tidak sesuai dengan shipment leg."
      );
    }

    // Scan harus valid.
    if (scan.result !== "VALID") {
      throw new Error(
        "Scan QR belum valid."
      );
    }

    if (
      scan.validation_status !==
      "VALID"
    ) {
      throw new Error(
        "Validasi scan belum berstatus VALID."
      );
    }

    // Lokasi scan harus sama dengan
    // lokasi penerimaan.
    if (
      String(
        scan.scanned_at_location_id
      ) !==
      String(received_at_location_id)
    ) {
      throw new Error(
        "Lokasi scan tidak sesuai dengan lokasi penerimaan."
      );
    }

    // =========================
    // VALIDATE SCAN IS ARRIVAL
    // =========================

    if (
      String(
        scan.scanned_at_location_id
      ) !==
      String(leg.to_event_location_id)
    ) {
      throw new Error(
        "Scan yang digunakan untuk receipt harus berasal dari lokasi tujuan akhir shipment."
      );
    }

    // =========================
    // PREVENT DUPLICATE RECEIPT
    // =========================

    const existingReceipt =
      await client.query(
        `
        SELECT
          id,
          shipment_leg_id,
          scan_attempt_id,
          status
        FROM shipment_receipts
        WHERE
          shipment_leg_id = $1::bigint
          OR scan_attempt_id = $2::bigint
        FOR UPDATE
        `,
        [
          shipment_leg_id,
          scan_attempt_id,
        ]
      );

    if (
      existingReceipt.rows.length > 0
    ) {
      throw new Error(
        "Receipt untuk shipment leg atau scan ini sudah dibuat."
      );
    }

    // =========================
    // GET SHIPMENT ITEMS
    // =========================

    const shipmentItemsResult =
      await client.query(
        `
        SELECT
          si.id,
          si.request_item_id,
          si.quantity,
          si.status
        FROM shipment_items si
        WHERE si.shipment_id = $1::bigint
        ORDER BY si.id ASC
        FOR UPDATE
        `,
        [id]
      );

    if (
      shipmentItemsResult.rows.length === 0
    ) {
      throw new Error(
        "Shipment tidak memiliki item."
      );
    }

    const shipmentItems =
      shipmentItemsResult.rows;

    // =========================
    // CHECK JUMLAH ITEM
    // =========================

    if (
      items.length !==
      shipmentItems.length
    ) {
      throw new Error(
        `Semua item shipment wajib dicantumkan. Shipment memiliki ${shipmentItems.length} item, tetapi receipt hanya menerima ${items.length} item.`
      );
    }

    // =========================
    // CHECK DUPLICATE ITEM
    // =========================

    const receivedItemIds =
      new Set<string>();

    for (const item of items) {
      const itemId = String(
        item.shipment_item_id
      );

      if (receivedItemIds.has(itemId)) {
        throw new Error(
          `Shipment item ${itemId} dicantumkan lebih dari satu kali.`
        );
      }

      receivedItemIds.add(itemId);
    }

    // =========================
    // VALIDATE RECEIPT ITEMS
    // =========================

    const validatedItems: Array<{
      shipmentItemId: string;
      qtyGood: number;
      qtyDamaged: number;
      qtyRejected: number;
      total: number;
      status: string;
    }> = [];

    for (const shipmentItem of shipmentItems) {
      const item =
        items.find(
          (row) =>
            String(
              row.shipment_item_id
            ) ===
            String(
              shipmentItem.id
            )
        );

      if (!item) {
        throw new Error(
          `Shipment item ${shipmentItem.id} belum dicantumkan dalam receipt.`
        );
      }

      const qtyGood = Number(
        item.qty_good ?? 0
      );

      const qtyDamaged = Number(
        item.qty_damaged ?? 0
      );

      const qtyRejected = Number(
        item.qty_rejected ?? 0
      );

      // -------------------------
      // NUMBER VALIDATION
      // -------------------------

      if (
        !Number.isFinite(qtyGood) ||
        !Number.isFinite(qtyDamaged) ||
        !Number.isFinite(qtyRejected)
      ) {
        throw new Error(
          `Jumlah item ${shipmentItem.id} tidak valid.`
        );
      }

      if (
        qtyGood < 0 ||
        qtyDamaged < 0 ||
        qtyRejected < 0
      ) {
        throw new Error(
          `Jumlah item ${shipmentItem.id} tidak boleh negatif.`
        );
      }

      // -------------------------
      // TOTAL
      // -------------------------

      const total =
        qtyGood +
        qtyDamaged +
        qtyRejected;

      if (total <= 0) {
        throw new Error(
          `Jumlah penerimaan item ${shipmentItem.id} harus lebih dari 0.`
        );
      }

      // Receipt harus mencatat
      // seluruh quantity shipment.
      if (
        total !==
        Number(shipmentItem.quantity)
      ) {
        throw new Error(
          `Jumlah penerimaan item ${shipmentItem.id} harus tepat ${shipmentItem.quantity}, tetapi yang diterima ${total}.`
        );
      }

      // -------------------------
      // STATUS ITEM
      // -------------------------

      let itemStatus = "RECEIVED";

      if (qtyRejected > 0) {
        itemStatus = "CANCELLED";
      } else if (qtyDamaged > 0) {
        itemStatus = "DAMAGED";
      }

      validatedItems.push({
        shipmentItemId:
          String(shipmentItem.id),
        qtyGood,
        qtyDamaged,
        qtyRejected,
        total,
        status: itemStatus,
      });
    }

    // =========================
    // CREATE RECEIPT
    // =========================

    const receiptResult =
      await client.query(
        `
        INSERT INTO shipment_receipts (
          shipment_leg_id,
          scan_attempt_id,
          received_by,
          received_at_location_id,
          receipt_type,
          status,
          received_at
        )
        VALUES (
          $1::bigint,
          $2::bigint,
          $3::bigint,
          $4::bigint,
          'STANDARD',
          'RECEIVED',
          NOW()
        )
        RETURNING
          id,
          shipment_leg_id,
          scan_attempt_id,
          received_by,
          received_at_location_id,
          receipt_type,
          status,
          received_at
        `,
        [
          shipment_leg_id,
          scan_attempt_id,
          user.id,
          received_at_location_id,
        ]
      );

    const receipt =
      receiptResult.rows[0];

    // =========================
    // CREATE RECEIPT ITEMS
    // =========================

    for (const item of validatedItems) {
      await client.query(
        `
        INSERT INTO receipt_items (
          receipt_id,
          shipment_item_id,
          qty_good,
          qty_damaged,
          qty_rejected
        )
        VALUES (
          $1::bigint,
          $2::bigint,
          $3::numeric,
          $4::numeric,
          $5::numeric
        )
        `,
        [
          receipt.id,
          item.shipmentItemId,
          item.qtyGood,
          item.qtyDamaged,
          item.qtyRejected,
        ]
      );
    }

    // =========================
    // UPDATE SHIPMENT ITEMS
    // =========================

    for (const item of validatedItems) {
      await client.query(
        `
        UPDATE shipment_items
        SET
          status = $1::varchar
        WHERE
          id = $2::bigint
          AND shipment_id = $3::bigint
        `,
        [
          item.status,
          item.shipmentItemId,
          id,
        ]
      );
    }

    // =========================
    // REVOKE QR
    // =========================

    if (scan.shipment_qr_id) {
      await client.query(
        `
        UPDATE shipment_qr
        SET
          status = 'REVOKED',
          revoked_at = NOW()
        WHERE
          id = $1::bigint
          AND status = 'ACTIVE'
        `,
        [scan.shipment_qr_id]
      );
    }

    // =========================
    // UPDATE LEG
    // =========================

    await client.query(
      `
      UPDATE shipment_legs
      SET
        status = 'ARRIVED',
        arrived_at = COALESCE(
          arrived_at,
          NOW()
        )
      WHERE id = $1::bigint
      `,
      [shipment_leg_id]
    );

    // =========================
    // UPDATE SHIPMENT
    // =========================

    await client.query(
      `
      UPDATE shipments
      SET
        status = 'DELIVERED',
        delivered_at = NOW()
      WHERE id = $1::bigint
      `,
      [id]
    );

    // =========================
    // COMMIT
    // =========================

    await client.query("COMMIT");

    // =========================
    // RESPONSE
    // =========================

    return NextResponse.json({
      success: true,
      message:
        "Penerimaan shipment berhasil dicatat.",

      receipt: {
        id: receipt.id,
        shipment_leg_id:
          receipt.shipment_leg_id,
        scan_attempt_id:
          receipt.scan_attempt_id,
        received_by:
          receipt.received_by,
        received_at_location_id:
          receipt.received_at_location_id,
        receipt_type:
          receipt.receipt_type,
        status: receipt.status,
        received_at:
          receipt.received_at,
      },

      shipment: {
        id: shipment.id,
        shipment_code:
          shipment.shipment_code,
        status: "DELIVERED",
      },

      location: {
        id: receiptLocation.id,
        name:
          receiptLocation.location_name,
        type: receiptLocation.type,
      },

      items: validatedItems,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "Create receipt error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal mencatat penerimaan shipment.",
      },
      { status: 400 }
    );
  } finally {
    client.release();
  }
}