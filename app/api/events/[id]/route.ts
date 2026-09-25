import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const eventResult = await db.query(
      `
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
      WHERE id = $1
      LIMIT 1
      `,
      [id]
    );

    if (eventResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Kejadian bencana tidak ditemukan",
        },
        { status: 404 }
      );
    }

    const locationsResult = await db.query(
      `
      SELECT
        el.id,
        el.physical_location_id,
        el.type,
        el.status,
        el.activated_at,
        el.deactivated_at,
        pl.name,
        pl.address,
        pl.latitude,
        pl.longitude
      FROM event_locations el
      JOIN physical_locations pl
        ON pl.id = el.physical_location_id
      WHERE el.disaster_event_id = $1
      ORDER BY el.id ASC
      `,
      [id]
    );

    return NextResponse.json({
      success: true,
      event: eventResult.rows[0],
      locations: locationsResult.rows,
    });
  } catch (error) {
    console.error("Get event detail error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil detail kejadian bencana",
      },
      { status: 500 }
    );
  }
}