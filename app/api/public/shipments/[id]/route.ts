import { NextResponse } from "next/server";
import db from "@/lib/db";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * GET /api/public/shipments/[id]
 *
 * Endpoint publik tanpa autentikasi. Mengembalikan detail
 * shipment termasuk item dan tracking legs.
 */
export async function GET(
  _request: Request,
  { params }: Params
) {
  try {
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

    // Detail shipment utama
    const shipmentResult = await db.query(
      `
      SELECT
        s.id,
        s.shipment_code,
        s.request_id,
        s.status,
        s.created_at,
        s.dispatched_at,
        s.delivered_at,

        ar.request_code,
        ar.disaster_event_id,
        ar.reason AS request_reason,
        ar.requested_at,
        ar.approved_at,
        de.code AS event_code,
        de.name AS event_name,

        ar.requester_location_id,
        pl.name AS requester_location_name,
        pl.address AS requester_location_address

      FROM shipments s
      JOIN aid_requests ar
        ON ar.id = s.request_id
      JOIN disaster_events de
        ON de.id = ar.disaster_event_id
      JOIN event_locations el
        ON el.id = ar.requester_location_id
      JOIN physical_locations pl
        ON pl.id = el.physical_location_id
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

    // Item-item bantuan
    const itemsResult = await db.query(
      `
      SELECT
        si.id AS shipment_item_id,
        si.quantity,
        si.status,
        ai.code AS item_code,
        ai.name AS item_name,
        ai.unit
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

    // Tracking legs
    const legsResult = await db.query(
      `
      SELECT
        sl.id,
        sl.sequence_no,
        from_pl.name AS from_location_name,
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

    return NextResponse.json({
      success: true,
      shipment: {
        id: Number(shipment.id),
        shipment_code: shipment.shipment_code,
        request_id: Number(shipment.request_id),
        request_code: shipment.request_code,
        status: shipment.status,
        created_at: shipment.created_at,
        dispatched_at: shipment.dispatched_at,
        delivered_at: shipment.delivered_at,
        request_reason: shipment.request_reason,
        requested_at: shipment.requested_at,
        approved_at: shipment.approved_at,
        event: {
          id: Number(shipment.disaster_event_id),
          code: shipment.event_code,
          name: shipment.event_name,
        },
        destination: {
          id: Number(shipment.requester_location_id),
          name: shipment.requester_location_name,
          address: shipment.requester_location_address,
        },
      },
      items: itemsResult.rows.map((row) => ({
        id: Number(row.shipment_item_id),
        item_code: row.item_code,
        item_name: row.item_name,
        unit: row.unit,
        quantity: Number(row.quantity),
        status: row.status,
      })),
      legs: legsResult.rows.map((leg) => ({
        id: Number(leg.id),
        sequence_no: Number(leg.sequence_no),
        from_location_name: leg.from_location_name,
        to_location_name: leg.to_location_name,
        status: leg.status,
        dispatched_at: leg.dispatched_at,
        arrived_at: leg.arrived_at,
      })),
    });
  } catch (error) {
    console.error("GET /api/public/shipments/[id] error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil detail shipment.",
      },
      { status: 500 }
    );
  }
}
