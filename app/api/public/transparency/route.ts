import { NextResponse } from "next/server";
import db from "@/lib/db";

/**
 * GET /api/public/transparency
 *
 * Endpoint publik tanpa autentikasi. Hanya mengembalikan data
 * yang memang dimaksudkan untuk transparansi publik:
 * - Event bencana
 * - Ringkasan permintaan bantuan (tanpa nama petugas individual)
 * - Status shipment
 */
export async function GET() {
  try {
    // 1. Event bencana
    const eventsResult = await db.query(`
      SELECT
        id,
        code,
        name,
        description,
        status,
        started_at,
        ended_at,
        created_at
      FROM disaster_events
      ORDER BY started_at DESC
      LIMIT 50
    `);

    // 2. Ringkasan permintaan bantuan (tanpa nama petugas untuk privasi)
    const requestsResult = await db.query(`
      SELECT
        ar.id,
        ar.request_code,
        de.code AS event_code,
        de.name AS event_name,
        pl.name AS requester_location_name,
        ar.status,
        ar.reason,
        ar.requested_at,
        ar.approved_at,
        s.shipment_code,
        s.status AS shipment_status
      FROM aid_requests ar
      JOIN disaster_events de
        ON de.id = ar.disaster_event_id
      JOIN event_locations el
        ON el.id = ar.requester_location_id
      JOIN physical_locations pl
        ON pl.id = el.physical_location_id
      LEFT JOIN shipments s
        ON s.request_id = ar.id
      ORDER BY ar.requested_at DESC
      LIMIT 50
    `);

    // 3. Shipment dengan tracking legs
    const shipmentsResult = await db.query(`
      SELECT
        s.id,
        s.shipment_code,
        s.status,
        s.created_at,
        s.dispatched_at,
        s.delivered_at,
        ar.request_code,
        de.code AS event_code,
        de.name AS event_name,
        pl.name AS destination_name,
        pl.address AS destination_address
      FROM shipments s
      JOIN aid_requests ar
        ON ar.id = s.request_id
      JOIN disaster_events de
        ON de.id = ar.disaster_event_id
      JOIN event_locations el
        ON el.id = ar.requester_location_id
      JOIN physical_locations pl
        ON pl.id = el.physical_location_id
      ORDER BY s.created_at DESC
      LIMIT 50
    `);

    return NextResponse.json({
      success: true,
      events: eventsResult.rows.map((row) => ({
        id: Number(row.id),
        code: row.code,
        name: row.name,
        description: row.description,
        status: row.status,
        started_at: row.started_at,
        ended_at: row.ended_at,
        created_at: row.created_at,
      })),
      requests: requestsResult.rows.map((row) => ({
        id: Number(row.id),
        request_code: row.request_code,
        event_code: row.event_code,
        event_name: row.event_name,
        requester_location_name: row.requester_location_name,
        status: row.status,
        reason: row.reason,
        requested_at: row.requested_at,
        approved_at: row.approved_at,
        shipment_code: row.shipment_code ?? null,
        shipment_status: row.shipment_status ?? null,
      })),
      shipments: shipmentsResult.rows.map((row) => ({
        id: Number(row.id),
        shipment_code: row.shipment_code,
        status: row.status,
        created_at: row.created_at,
        dispatched_at: row.dispatched_at,
        delivered_at: row.delivered_at,
        request_code: row.request_code,
        event_code: row.event_code,
        event_name: row.event_name,
        destination_name: row.destination_name,
        destination_address: row.destination_address,
      })),
    });
  } catch (error) {
    console.error("GET /api/public/transparency error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil data transparansi.",
      },
      { status: 500 }
    );
  }
}
