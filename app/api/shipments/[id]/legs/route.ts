import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

/*
 * ============================================================
 * GET
 * ============================================================
 *
 * Mengambil seluruh shipment legs berdasarkan shipment ID.
 */
export async function GET(
  _request: Request,
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

    /*
     * Pastikan shipment memang ada.
     */
    const shipmentResult = await db.query(
      `
      SELECT
        s.id,
        s.shipment_code,
        s.request_id,
        s.status
      FROM shipments s
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

    /*
     * Ambil legs sekaligus nama lokasi.
     */
    const result = await db.query(
      `
      SELECT
        sl.id,
        sl.shipment_id,
        sl.sequence_no,

        sl.from_event_location_id,
        from_pl.name AS from_location_name,

        sl.to_event_location_id,
        to_pl.name AS to_location_name,

        sl.status,
        sl.dispatched_at,
        sl.arrived_at

      FROM shipment_legs sl

      JOIN event_locations from_el
        ON from_el.id = sl.from_event_location_id

      JOIN physical_locations from_pl
        ON from_pl.id = from_el.physical_location_id

      JOIN event_locations to_el
        ON to_el.id = sl.to_event_location_id

      JOIN physical_locations to_pl
        ON to_pl.id = to_el.physical_location_id

      WHERE sl.shipment_id = $1::bigint

      ORDER BY sl.sequence_no ASC
      `,
      [id]
    );

    const legs = result.rows.map((leg) => ({
      id: Number(leg.id),
      shipment_id: Number(leg.shipment_id),
      sequence_no: Number(leg.sequence_no),

      from_event_location_id: Number(
        leg.from_event_location_id
      ),
      from_location_name:
        leg.from_location_name,

      to_event_location_id: Number(
        leg.to_event_location_id
      ),
      to_location_name:
        leg.to_location_name,

      status: leg.status,
      dispatched_at: leg.dispatched_at,
      arrived_at: leg.arrived_at,
    }));

    return NextResponse.json({
      success: true,
      shipment: {
        id: Number(shipmentResult.rows[0].id),
        shipment_code:
          shipmentResult.rows[0].shipment_code,
        request_id: Number(
          shipmentResult.rows[0].request_id
        ),
        status:
          shipmentResult.rows[0].status,
      },
      legs,
    });
  } catch (error) {
    console.error(
      "GET /api/shipments/[id]/legs error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal mengambil shipment legs.",
      },
      { status: 500 }
    );
  }
}

/*
 * ============================================================
 * POST
 * ============================================================
 *
 * Membuat shipment leg baru.
 */
export async function POST(
  request: Request,
  { params }: Params
) {
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

    if (
      user.role.code !== "ADMIN" &&
      user.role.code !== "GUDANG"
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

    const body = await request.json();

    const toEventLocationId = Number(
      body.to_event_location_id
    );

    if (!Number.isInteger(toEventLocationId)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "to_event_location_id wajib berupa angka.",
        },
        { status: 400 }
      );
    }

    await client.query("BEGIN");

    // =========================================================
    // 1. Lock shipment + ambil event/request
    // =========================================================

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

    if (shipmentResult.rowCount === 0) {
      throw new Error(
        "Shipment tidak ditemukan."
      );
    }

    const shipment = shipmentResult.rows[0];

    if (
      shipment.status !== "READY" &&
      shipment.status !== "IN_TRANSIT"
    ) {
      throw new Error(
        `Shipment dengan status ${shipment.status} tidak dapat dibuatkan leg baru.`
      );
    }

    // =========================================================
    // 2. Ambil leg terakhir
    // =========================================================

    const lastLegResult = await client.query(
      `
      SELECT
        id,
        sequence_no,
        from_event_location_id,
        to_event_location_id,
        status

      FROM shipment_legs

      WHERE shipment_id = $1::bigint

      ORDER BY sequence_no DESC

      LIMIT 1

      FOR UPDATE
      `,
      [id]
    );

    let sequenceNo = 1;
    let fromEventLocationId: number;

    if (lastLegResult.rowCount === 0) {
      /*
       * Belum punya leg.
       *
       * FROM = warehouse aktif
       * pada event shipment.
       */
      const warehouseResult = await client.query(
        `
        SELECT
          id

        FROM event_locations

        WHERE disaster_event_id = $1::bigint
          AND type = 'WAREHOUSE'
          AND status = 'ACTIVE'

        ORDER BY id

        LIMIT 1
        `,
        [shipment.disaster_event_id]
      );

      if (warehouseResult.rowCount === 0) {
        throw new Error(
          "Warehouse aktif untuk event ini tidak ditemukan."
        );
      }

      fromEventLocationId = Number(
        warehouseResult.rows[0].id
      );
    } else {
      const lastLeg =
        lastLegResult.rows[0];

      /*
       * Leg sebelumnya harus sudah selesai
       * sebelum leg berikutnya dibuat.
       */
      if (lastLeg.status !== "ARRIVED") {
        throw new Error(
          `Leg sebelumnya belum ARRIVED. Status saat ini: ${lastLeg.status}.`
        );
      }

      sequenceNo =
        Number(lastLeg.sequence_no) + 1;

      /*
       * FROM leg baru =
       * TO leg sebelumnya.
       */
      fromEventLocationId = Number(
        lastLeg.to_event_location_id
      );
    }

    // =========================================================
    // 3. Validasi FROM dan TO
    // =========================================================

    if (
      fromEventLocationId ===
      toEventLocationId
    ) {
      throw new Error(
        "Lokasi tujuan tidak boleh sama dengan lokasi asal."
      );
    }

    const locationsResult =
      await client.query(
        `
        SELECT
          el.id,
          el.disaster_event_id,
          el.type,
          el.status,
          pl.name AS location_name

        FROM event_locations el

        JOIN physical_locations pl
          ON pl.id =
             el.physical_location_id

        WHERE el.id IN (
          $1::bigint,
          $2::bigint
        )
        `,
        [
          fromEventLocationId,
          toEventLocationId,
        ]
      );

    if (locationsResult.rowCount !== 2) {
      throw new Error(
        "Lokasi asal atau tujuan tidak ditemukan."
      );
    }

    const fromLocation =
      locationsResult.rows.find(
        (row) =>
          Number(row.id) ===
          fromEventLocationId
      );

    const toLocation =
      locationsResult.rows.find(
        (row) =>
          Number(row.id) ===
          toEventLocationId
      );

    if (!fromLocation || !toLocation) {
      throw new Error(
        "Lokasi asal atau tujuan tidak valid."
      );
    }

    // =========================================================
    // 4. Pastikan event sama
    // =========================================================

    if (
      Number(
        fromLocation.disaster_event_id
      ) !==
        Number(
          shipment.disaster_event_id
        ) ||
      Number(
        toLocation.disaster_event_id
      ) !==
        Number(
          shipment.disaster_event_id
        )
    ) {
      throw new Error(
        "Lokasi asal dan tujuan harus berada pada event yang sama."
      );
    }

    // =========================================================
    // 5. Pastikan lokasi ACTIVE
    // =========================================================

    if (
      fromLocation.status !==
        "ACTIVE" ||
      toLocation.status !==
        "ACTIVE"
    ) {
      throw new Error(
        "Lokasi asal dan tujuan harus berstatus ACTIVE."
      );
    }

    // =========================================================
    // 6. Insert shipment leg
    // =========================================================

    const legResult = await client.query(
      `
      INSERT INTO shipment_legs (
        shipment_id,
        sequence_no,
        from_event_location_id,
        to_event_location_id,
        status
      )

      VALUES (
        $1::bigint,
        $2::integer,
        $3::bigint,
        $4::bigint,
        'PENDING'
      )

      RETURNING
        id,
        shipment_id,
        sequence_no,
        from_event_location_id,
        to_event_location_id,
        status,
        dispatched_at,
        arrived_at
      `,
      [
        id,
        sequenceNo,
        fromEventLocationId,
        toEventLocationId,
      ]
    );

    await client.query("COMMIT");

    const leg = legResult.rows[0];

    return NextResponse.json({
      success: true,
      message:
        "Shipment leg berhasil dibuat.",

      leg: {
        id: Number(leg.id),

        shipment_id: Number(
          leg.shipment_id
        ),

        sequence_no: Number(
          leg.sequence_no
        ),

        from_event_location_id:
          Number(
            leg.from_event_location_id
          ),

        to_event_location_id:
          Number(
            leg.to_event_location_id
          ),

        status: leg.status,

        dispatched_at:
          leg.dispatched_at,

        arrived_at:
          leg.arrived_at,

        from_location_name:
          fromLocation.location_name,

        to_location_name:
          toLocation.location_name,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "POST /api/shipments/[id]/legs error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal membuat shipment leg.",
      },
      { status: 400 }
    );
  } finally {
    client.release();
  }
}