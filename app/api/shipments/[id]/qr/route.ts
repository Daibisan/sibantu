import { NextResponse } from "next/server";
import crypto from "crypto";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: Params
) {
  try {
    // =========================================================
    // 1. AUTH
    // =========================================================

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

    if (
      user.role.code !== "ADMIN" &&
      user.role.code !== "GUDANG" &&
      user.role.code !== "PETUGAS_POSKO"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Tidak memiliki akses",
        },
        { status: 403 }
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

    // =========================================================
    // 2. SHIPMENT
    // =========================================================

    const shipmentResult = await db.query(
      `
      SELECT
        s.id,
        s.shipment_code,
        s.status,
        s.request_id,

        ar.request_code,
        ar.disaster_event_id

      FROM shipments s

      JOIN aid_requests ar
        ON ar.id = s.request_id

      WHERE s.id = $1::bigint

      LIMIT 1
      `,
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

    const shipment = shipmentResult.rows[0];

    // =========================================================
    // 3. SHIPMENT LEG
    // =========================================================

    const legResult = await db.query(
      `
      SELECT
        sl.id,
        sl.sequence_no,
        sl.status,

        sl.from_event_location_id,
        from_pl.name AS from_location_name,

        sl.to_event_location_id,
        to_pl.name AS to_location_name

      FROM shipment_legs sl

      JOIN event_locations from_el
        ON from_el.id =
           sl.from_event_location_id

      JOIN physical_locations from_pl
        ON from_pl.id =
           from_el.physical_location_id

      JOIN event_locations to_el
        ON to_el.id =
           sl.to_event_location_id

      JOIN physical_locations to_pl
        ON to_pl.id =
           to_el.physical_location_id

      WHERE sl.shipment_id = $1::bigint

      ORDER BY sl.sequence_no ASC

      LIMIT 1
      `,
      [id]
    );

    if (legResult.rowCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Shipment belum memiliki rute/leg.",
        },
        { status: 404 }
      );
    }

    const leg = legResult.rows[0];

    // =========================================================
    // 4. SHIPMENT ITEMS
    // =========================================================

    const itemsResult = await db.query(
      `
      SELECT
        si.id AS shipment_item_id,
        si.request_item_id,

        ai.code,
        ai.name,
        ai.unit,

        si.quantity,
        si.status

      FROM shipment_items si

      JOIN aid_request_items ari
        ON ari.id = si.request_item_id

      JOIN aid_items ai
        ON ai.id = ari.aid_item_id

      WHERE si.shipment_id = $1::bigint

      ORDER BY si.id ASC
      `,
      [id]
    );

    // =========================================================
    // 5. QR
    // =========================================================

    const qrResult = await db.query(
      `
      SELECT
        id,
        shipment_id,
        public_token,
        status,
        generated_at,
        revoked_at

      FROM shipment_qr

      WHERE shipment_id = $1::bigint

      ORDER BY id DESC

      LIMIT 1
      `,
      [id]
    );

    let shipmentQR = qrResult.rows[0] ?? null;

    /*
     * Kalau belum ada QR sama sekali,
     * generate satu QR.
     */
    if (!shipmentQR) {
      const publicToken =
        crypto.randomBytes(32).toString("hex");

      const insertQR = await db.query(
        `
        INSERT INTO shipment_qr (
          shipment_id,
          public_token,
          status,
          generated_at
        )

        VALUES (
          $1::bigint,
          $2,
          'ACTIVE',
          NOW()
        )

        RETURNING
          id,
          shipment_id,
          public_token,
          status,
          generated_at,
          revoked_at
        `,
        [id, publicToken]
      );

      shipmentQR = insertQR.rows[0];
    }

    // =========================================================
    // 6. MANIFEST
    // =========================================================

    const manifest = {
      version: 1,

      shipment: {
        id: Number(shipment.id),
        code: shipment.shipment_code,
        request_code: shipment.request_code,
        request_id: Number(
          shipment.request_id
        ),
        status: shipment.status,
        event_id: Number(
          shipment.disaster_event_id
        ),
      },

      qr: {
        id: Number(shipmentQR.id),
        public_token:
          shipmentQR.public_token,
        status: shipmentQR.status,
        generated_at:
          shipmentQR.generated_at,
        revoked_at:
          shipmentQR.revoked_at,
      },

      leg: {
        id: Number(leg.id),
        sequence_no: Number(
          leg.sequence_no
        ),
        status: leg.status,
      },

      route: {
        from: {
          id: Number(
            leg.from_event_location_id
          ),
          name: leg.from_location_name,
        },

        to: {
          id: Number(
            leg.to_event_location_id
          ),
          name: leg.to_location_name,
        },
      },

      items: itemsResult.rows.map(
        (item) => ({
          shipment_item_id: Number(
            item.shipment_item_id
          ),

          request_item_id: Number(
            item.request_item_id
          ),

          code: item.code,
          name: item.name,

          quantity: Number(
            item.quantity
          ),

          unit: item.unit,
          status: item.status,
        })
      ),

      issued_at:
        new Date().toISOString(),
    };

    // =========================================================
    // 7. RESPONSE
    // =========================================================

    return NextResponse.json({
      success: true,
      manifest,
    });
  } catch (error) {
    console.error(
      "GET /api/shipments/[id]/qr error:"
    );

    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal mengambil manifest shipment",
      },
      { status: 500 }
    );
  }
}