import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  try {
    const result = await db.query(`
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
    `);

    return NextResponse.json({
      success: true,
      events: result.rows,
    });
  } catch (error) {
    console.error("Get events error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil data bencana",
      },
      { status: 500 }
    );
  }
}