import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
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

    const result = await db.query(`
      SELECT
        il.id,
        il.lot_code,
        il.aid_item_id,
        ai.code AS item_code,
        ai.name AS item_name,
        ai.unit,

        il.event_location_id,
        pl.name AS location_name,

        il.on_hand_qty,
        il.reserved_qty,
        (il.on_hand_qty - il.reserved_qty) AS available_qty,

        il.status,
        il.received_at,
        il.expired_at

      FROM inventory_lots il

      JOIN aid_items ai
        ON ai.id = il.aid_item_id

      JOIN event_locations el
        ON el.id = il.event_location_id

      JOIN physical_locations pl
        ON pl.id = el.physical_location_id

      ORDER BY
        il.expired_at ASC NULLS LAST,
        il.received_at ASC,
        il.id ASC
    `);

    return NextResponse.json({
      success: true,
      inventory: result.rows,
    });
  } catch (error) {
    console.error("Get inventory error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil data inventory",
      },
      { status: 500 }
    );
  }
}