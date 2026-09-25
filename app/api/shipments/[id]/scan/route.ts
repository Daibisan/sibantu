import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/* ============================================================
   GET
   ============================================================ */

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
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

    const roleCode = user.role?.code;

    const allowedRoles = [
      "ADMIN",
      "GUDANG",
      "PETUGAS_POSKO",
    ];

    if (!allowedRoles.includes(roleCode)) {
      return NextResponse.json(
        {
          success: false,
          message: "Tidak memiliki akses",
          debug: {
            roleCode,
          },
        },
        { status: 403 }
      );
    }

    // =========================
    // PARAMETER
    // =========================
    const { id } = await params;

    if (!id || !/^\d+$/.test(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "ID shipment tidak valid.",
        },
        { status: 400 }
      );
    }

    // =========================
    // CHECK SHIPMENT
    // =========================
    const shipmentResult = await db.query(
      `
      SELECT
        s.id,
        s.shipment_code,
        s.request_id,
        s.status,
        s.created_at,
        s.dispatched_at,
        s.delivered_at
      FROM shipments s
      WHERE s.id = $1::bigint
      LIMIT 1
      `,
      [id]
    );

    if (shipmentResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Shipment tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    const shipment = shipmentResult.rows[0];

    // =========================
    // GET SCAN HISTORY
    // =========================
    const scanResult = await db.query(
      `
      SELECT
        sa.id,
        sa.client_event_id,

        sa.shipment_qr_id,
        sa.shipment_leg_id,

        sa.scanned_by,
        u.name AS scanned_by_name,

        sa.scanned_at_location_id,
        pl.name AS scanned_at_location_name,
        el.type AS scanned_at_location_type,

        sa.result,
        sa.rejection_reason,

        sa.device_scanned_at,
        sa.server_received_at,

        sv.id AS validation_id,
        sv.validation_status,
        sv.reason AS validation_reason,
        sv.validated_at,

        sl.sequence_no,
        sl.from_event_location_id,
        from_pl.name AS from_location_name,

        sl.to_event_location_id,
        to_pl.name AS to_location_name,

        CASE
          WHEN sa.scanned_at_location_id =
               sl.from_event_location_id
            THEN 'DEPARTURE'

          WHEN sa.scanned_at_location_id =
               sl.to_event_location_id
            THEN 'ARRIVAL'

          ELSE 'CHECKPOINT'
        END AS scan_type

      FROM scan_attempts sa

      JOIN users u
        ON u.id = sa.scanned_by

      JOIN event_locations el
        ON el.id = sa.scanned_at_location_id

      JOIN physical_locations pl
        ON pl.id = el.physical_location_id

      JOIN shipment_legs sl
        ON sl.id = sa.shipment_leg_id
       AND sl.shipment_id = $1::bigint

      JOIN event_locations from_el
        ON from_el.id = sl.from_event_location_id

      JOIN physical_locations from_pl
        ON from_pl.id = from_el.physical_location_id

      JOIN event_locations to_el
        ON to_el.id = sl.to_event_location_id

      JOIN physical_locations to_pl
        ON to_pl.id = to_el.physical_location_id

      LEFT JOIN scan_validations sv
        ON sv.scan_attempt_id = sa.id

      WHERE sa.shipment_leg_id IN (
        SELECT id
        FROM shipment_legs
        WHERE shipment_id = $1::bigint
      )

      ORDER BY
        sa.server_received_at ASC,
        sa.id ASC
      `,
      [id]
    );

    // =========================
    // RESPONSE
    // =========================
    return NextResponse.json({
      success: true,

      shipment: {
        id: shipment.id,
        shipment_code: shipment.shipment_code,
        request_id: shipment.request_id,
        status: shipment.status,
        created_at: shipment.created_at,
        dispatched_at: shipment.dispatched_at,
        delivered_at: shipment.delivered_at,
      },

      scans: scanResult.rows,
    });
  } catch (error) {
    console.error(
      "Get shipment scan history error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Gagal mengambil riwayat scan shipment.",
      },
      { status: 500 }
    );
  }
}

/* ============================================================
   POST
   ============================================================ */

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

    const roleCode = user.role?.code;

    const allowedRoles = [
      "ADMIN",
      "GUDANG",
      "PETUGAS_POSKO",
    ];

    if (!allowedRoles.includes(roleCode)) {
      return NextResponse.json(
        {
          success: false,
          message: "Tidak memiliki akses",
          debug: {
            roleCode,
          },
        },
        { status: 403 }
      );
    }

    // =========================
    // PARAMETER
    // =========================
    const { id } = await params;

    let body: {
      client_event_id?: string;
      shipment_leg_id?: number | string;
      shipment_qr_id?: number | string;
      scanned_at_location_id?: number | string;
      device_scanned_at?: string;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Body JSON tidak valid.",
        },
        { status: 400 }
      );
    }

    const {
      client_event_id,
      shipment_leg_id,
      shipment_qr_id,
      scanned_at_location_id,
      device_scanned_at,
    } = body;

    if (!client_event_id) {
      return NextResponse.json(
        {
          success: false,
          message: "client_event_id wajib diisi",
        },
        { status: 400 }
      );
    }

    if (!shipment_leg_id) {
      return NextResponse.json(
        {
          success: false,
          message: "shipment_leg_id wajib diisi",
        },
        { status: 400 }
      );
    }

    if (!shipment_qr_id) {
      return NextResponse.json(
        {
          success: false,
          message: "shipment_qr_id wajib diisi",
        },
        { status: 400 }
      );
    }

    if (!scanned_at_location_id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "scanned_at_location_id wajib diisi",
        },
        { status: 400 }
      );
    }

    // =========================
    // TRANSACTION
    // =========================
    await client.query("BEGIN");

    // =========================
    // IDEMPOTENCY
    // =========================
    const existingScan = await client.query(
      `
      SELECT
        id,
        client_event_id,
        shipment_qr_id,
        shipment_leg_id,
        scanned_by,
        scanned_at_location_id,
        result,
        rejection_reason,
        device_scanned_at,
        server_received_at
      FROM scan_attempts
      WHERE client_event_id = $1::uuid
      `,
      [client_event_id]
    );

    if (existingScan.rows.length > 0) {
      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        message: "Scan sudah pernah diproses.",
        scan_attempt: existingScan.rows[0],
      });
    }

    // =========================
    // CHECK SHIPMENT
    // =========================
    const shipmentResult = await client.query(
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

    if (shipmentResult.rows.length === 0) {
      throw new Error(
        "Shipment tidak ditemukan."
      );
    }

    const shipment = shipmentResult.rows[0];

    // =========================
    // CHECK SHIPMENT STATUS
    // =========================
    if (
      ["DELIVERED", "CANCELLED"].includes(
        shipment.status
      )
    ) {
      throw new Error(
        `Shipment tidak dapat discan karena status ${shipment.status}.`
      );
    }

    // =========================
    // CHECK LEG
    // =========================
    const legResult = await client.query(
      `
      SELECT
        sl.id,
        sl.shipment_id,
        sl.sequence_no,
        sl.from_event_location_id,
        sl.to_event_location_id,
        sl.status,

        from_pl.name AS from_location_name,
        to_pl.name AS to_location_name

      FROM shipment_legs sl

      JOIN event_locations from_el
        ON from_el.id = sl.from_event_location_id

      JOIN physical_locations from_pl
        ON from_pl.id = from_el.physical_location_id

      JOIN event_locations to_el
        ON to_el.id = sl.to_event_location_id

      JOIN physical_locations to_pl
        ON to_pl.id = to_el.physical_location_id

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

    if (legResult.rows.length === 0) {
      throw new Error(
        "Shipment leg tidak ditemukan."
      );
    }

    const leg = legResult.rows[0];

    // =========================
    // CHECK LEG STATUS
    // =========================
    if (
      !["PENDING", "IN_TRANSIT"].includes(
        leg.status
      )
    ) {
      throw new Error(
        `Shipment leg tidak dapat discan karena status ${leg.status}.`
      );
    }

    // =========================
    // CHECK QR
    // =========================
    const qrResult = await client.query(
      `
      SELECT
        id,
        shipment_id,
        public_token,
        status
      FROM shipment_qr
      WHERE id = $1::bigint
      `,
      [shipment_qr_id]
    );

    if (qrResult.rows.length === 0) {
      throw new Error(
        "QR shipment tidak ditemukan."
      );
    }

    const qr = qrResult.rows[0];

    // QR harus milik shipment.
    if (
      String(qr.shipment_id) !==
      String(id)
    ) {
      throw new Error(
        "QR tidak sesuai dengan shipment."
      );
    }

    // QR harus masih aktif.
    if (qr.status !== "ACTIVE") {
      throw new Error(
        "QR shipment sudah tidak aktif."
      );
    }

    // =========================
    // CHECK SCAN LOCATION
    // =========================
    const locationResult = await client.query(
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
      [scanned_at_location_id]
    );

    if (locationResult.rows.length === 0) {
      throw new Error(
        "Lokasi scan tidak ditemukan."
      );
    }

    const scanLocation =
      locationResult.rows[0];

    // =========================
    // LOCATION MUST BE ACTIVE
    // =========================
    if (
      scanLocation.status !== "ACTIVE"
    ) {
      throw new Error(
        "Lokasi scan tidak aktif."
      );
    }

    // =========================
    // LOCATION MUST BE SAME EVENT
    // =========================
    if (
      String(
        scanLocation.disaster_event_id
      ) !==
      String(
        shipment.disaster_event_id
      )
    ) {
      throw new Error(
        "Lokasi scan berada pada event bencana yang berbeda."
      );
    }

    // =========================
    // TENTUKAN JENIS SCAN
    // =========================
    let scanType:
      | "DEPARTURE"
      | "CHECKPOINT"
      | "ARRIVAL";

    // ---------------------------------
    // FROM LOCATION
    // ---------------------------------
    if (
      String(scanned_at_location_id) ===
      String(leg.from_event_location_id)
    ) {
      scanType = "DEPARTURE";
    }

    // ---------------------------------
    // TO LOCATION
    // ---------------------------------
    else if (
      String(scanned_at_location_id) ===
      String(leg.to_event_location_id)
    ) {
      scanType = "ARRIVAL";
    }

    // ---------------------------------
    // OTHER LOCATION
    // ---------------------------------
    else {
      scanType = "CHECKPOINT";
    }

    // =========================
    // VALIDASI URUTAN SCAN
    // =========================

    // ---------------------------------
    // PENDING
    // ---------------------------------
    if (
      leg.status === "PENDING" &&
      scanType !== "DEPARTURE"
    ) {
      throw new Error(
        "Shipment belum berangkat. Scan pertama harus dilakukan di lokasi keberangkatan."
      );
    }

    // ---------------------------------
    // IN_TRANSIT + DEPARTURE
    // ---------------------------------
    if (
      leg.status === "IN_TRANSIT" &&
      scanType === "DEPARTURE"
    ) {
      throw new Error(
        "Shipment sudah dalam perjalanan."
      );
    }

    // =========================
    // DEVICE TIME
    // =========================
    const deviceScannedAt =
      device_scanned_at
        ? new Date(device_scanned_at)
        : new Date();

    if (
      Number.isNaN(
        deviceScannedAt.getTime()
      )
    ) {
      throw new Error(
        "device_scanned_at tidak valid."
      );
    }

    // =========================
    // CREATE SCAN ATTEMPT
    // =========================
    const scanResult = await client.query(
      `
      INSERT INTO scan_attempts (
        client_event_id,
        shipment_qr_id,
        shipment_leg_id,
        scanned_by,
        scanned_at_location_id,
        result,
        rejection_reason,
        device_scanned_at,
        server_received_at
      )
      VALUES (
        $1::uuid,
        $2::bigint,
        $3::bigint,
        $4::bigint,
        $5::bigint,
        'VALID',
        NULL,
        $6::timestamptz,
        NOW()
      )
      RETURNING
        id,
        client_event_id,
        shipment_qr_id,
        shipment_leg_id,
        scanned_by,
        scanned_at_location_id,
        result,
        rejection_reason,
        device_scanned_at,
        server_received_at
      `,
      [
        client_event_id,
        shipment_qr_id,
        shipment_leg_id,
        user.id,
        scanned_at_location_id,
        deviceScannedAt,
      ]
    );

    const scan = scanResult.rows[0];

    // =========================
    // CREATE VALIDATION
    // =========================
    let validationReason = "";

    if (
      scanType === "DEPARTURE"
    ) {
      validationReason =
        `Scan keberangkatan valid dari ${scanLocation.location_name}.`;
    } else if (
      scanType === "ARRIVAL"
    ) {
      validationReason =
        `Scan kedatangan valid di ${scanLocation.location_name}.`;
    } else {
      validationReason =
        `Checkpoint valid di ${scanLocation.location_name}.`;
    }

    const validationResult =
      await client.query(
        `
        INSERT INTO scan_validations (
          scan_attempt_id,
          validation_status,
          reason,
          validated_at
        )
        VALUES (
          $1::bigint,
          'VALID',
          $2,
          NOW()
        )
        RETURNING
          id,
          scan_attempt_id,
          validation_status,
          reason,
          validated_at
        `,
        [
          scan.id,
          validationReason,
        ]
      );

    // =========================
    // UPDATE STATUS
    // =========================

    // ---------------------------------
    // DEPARTURE
    // PENDING → IN_TRANSIT
    // ---------------------------------
    if (
      scanType === "DEPARTURE" &&
      leg.status === "PENDING"
    ) {
      await client.query(
        `
        UPDATE shipment_legs
        SET
          status = 'IN_TRANSIT',
          dispatched_at = COALESCE(
            dispatched_at,
            NOW()
          )
        WHERE id = $1::bigint
        `,
        [shipment_leg_id]
      );

      await client.query(
        `
        UPDATE shipments
        SET
          status = 'IN_TRANSIT',
          dispatched_at = COALESCE(
            dispatched_at,
            NOW()
          )
        WHERE id = $1::bigint
        `,
        [id]
      );
    }

    // ---------------------------------
    // CHECKPOINT
    // ---------------------------------
    if (
      scanType === "CHECKPOINT"
    ) {
      // Checkpoint hanya dicatat
      // di scan_attempts.
    }

    // ---------------------------------
    // ARRIVAL
    // IN_TRANSIT → ARRIVED
    // ---------------------------------
    if (
      scanType === "ARRIVAL" &&
      leg.status === "IN_TRANSIT"
    ) {
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

      // Shipment tetap IN_TRANSIT.
      //
      // DELIVERED baru setelah receipt.
    }

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
        scanType === "DEPARTURE"
          ? "Scan keberangkatan valid."
          : scanType === "CHECKPOINT"
          ? "Scan checkpoint valid."
          : "Scan kedatangan valid.",

      scan_type: scanType,

      location: {
        id: scanLocation.id,
        name: scanLocation.location_name,
        type: scanLocation.type,
      },

      shipment: {
        id: shipment.id,
        code: shipment.shipment_code,

        status:
          scanType === "DEPARTURE"
            ? "IN_TRANSIT"
            : shipment.status,
      },

      leg: {
        id: leg.id,
        sequence_no: leg.sequence_no,

        status:
          scanType === "ARRIVAL"
            ? "ARRIVED"
            : scanType === "DEPARTURE"
            ? "IN_TRANSIT"
            : leg.status,

        from_location: {
          id: leg.from_event_location_id,
          name: leg.from_location_name,
        },

        to_location: {
          id: leg.to_event_location_id,
          name: leg.to_location_name,
        },
      },

      scan_attempt: scan,

      validation:
        validationResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "Create scan attempt error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal memproses scan.",
      },
      { status: 400 }
    );
  } finally {
    client.release();
  }
}
