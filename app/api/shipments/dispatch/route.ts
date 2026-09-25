import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        message: "Belum login.",
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
        message:
          "Anda tidak memiliki akses untuk melakukan dispatch.",
      },
      { status: 403 }
    );
  }

  let shipmentId: number;

  try {
    const body = await request.clone().json().catch(() => ({})) as { shipment_id?: unknown; id?: unknown };
    shipmentId = Number(body.shipment_id ?? body.id);
  } catch {
    shipmentId = NaN;
  }

  if (!Number.isInteger(shipmentId) || shipmentId <= 0) {
    return NextResponse.json(
      {
        success: false,
        message: "ID shipment tidak valid.",
      },
      { status: 400 }
    );
  }

  let client;

  try {
    client = await db.connect();

    await client.query("BEGIN");

    /*
     * Lock shipment supaya dua petugas gudang
     * tidak bisa melakukan dispatch bersamaan.
     */
    const shipmentResult = await client.query(
      `
        SELECT
          s.id,
          s.shipment_code,
          s.request_id,
          s.status,
          s.created_at,
          s.dispatched_at,
          s.delivered_at,

          ar.disaster_event_id,
          ar.request_code,

          el.id AS requester_location_id,
          pl.name AS requester_location_name

        FROM shipments s

        JOIN aid_requests ar
          ON ar.id = s.request_id

        JOIN event_locations el
          ON el.id = ar.requester_location_id

        JOIN physical_locations pl
          ON pl.id = el.physical_location_id

        WHERE s.id = $1::bigint

        FOR UPDATE OF s
      `,
      [shipmentId]
    );

    if (shipmentResult.rowCount === 0) {
      throw new Error(
        "Shipment tidak ditemukan."
      );
    }

    const shipment = shipmentResult.rows[0];

    /*
     * Dispatch hanya boleh dilakukan
     * ketika shipment READY.
     */
    if (shipment.status !== "READY") {
      throw new Error(
        `Shipment tidak dapat di-dispatch karena status saat ini ${shipment.status}.`
      );
    }

    /*
     * Ambil leg pertama / leg aktif.
     */
    const legResult = await client.query(
      `
        SELECT
          sl.id,
          sl.shipment_id,
          sl.sequence_no,
          sl.from_event_location_id,
          sl.to_event_location_id,
          sl.status,
          sl.dispatched_at,
          sl.arrived_at,

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

        WHERE sl.shipment_id = $1::bigint
          AND sl.status IN ('PENDING', 'IN_TRANSIT')

        ORDER BY sl.sequence_no ASC

        FOR UPDATE OF sl
      `,
      [shipmentId]
    );

    if (legResult.rowCount === 0) {
      throw new Error(
        "Shipment belum memiliki leg pengiriman yang dapat di-dispatch."
      );
    }

    const leg = legResult.rows[0];

    /*
     * Untuk dispatch pertama:
     *
     * Gudang Utama BPBD = event_location_id 1
     *
     * Jadi sementara MVP kita pastikan
     * keberangkatan pertama memang berasal
     * dari Gudang.
     */
    if (
      Number(leg.from_event_location_id) !== 1
    ) {
      throw new Error(
        "Lokasi keberangkatan shipment bukan Gudang Utama BPBD."
      );
    }

    /*
     * Leg harus PENDING.
     *
     * Kalau sudah IN_TRANSIT berarti sudah
     * pernah di-dispatch.
     */
    if (leg.status !== "PENDING") {
      throw new Error(
        "Leg shipment sudah pernah di-dispatch."
      );
    }

    /*
     * Update leg.
     */
    const updatedLegResult =
      await client.query(
        `
          UPDATE shipment_legs
          SET
            status = 'IN_TRANSIT',
            dispatched_at = NOW()
          WHERE id = $1::bigint
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
        [leg.id]
      );

    /*
     * Update shipment.
     */
    const updatedShipmentResult =
      await client.query(
        `
          UPDATE shipments
          SET
            status = 'IN_TRANSIT',
            dispatched_at = NOW()
          WHERE id = $1::bigint
          RETURNING
            id,
            shipment_code,
            request_id,
            status,
            created_at,
            dispatched_at,
            delivered_at
        `,
        [shipmentId]
      );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      message:
        "Shipment berhasil di-dispatch dan sedang dalam perjalanan.",
      shipment:
        updatedShipmentResult.rows[0],
      leg: {
        ...updatedLegResult.rows[0],
        from_location_name:
          leg.from_location_name,
        to_location_name:
          leg.to_location_name,
      },
    });
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // ignore rollback error
      }
    }

    console.error(
      "Dispatch shipment error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal melakukan dispatch shipment.",
      },
      { status: 400 }
    );
  } finally {
    client?.release();
  }
}