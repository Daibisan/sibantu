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
        { status: 401 },
      );
    }

    const result = await db.query(`
      SELECT
        id,
        code,
        name,
        unit,
        description
      FROM aid_items
      WHERE is_active = TRUE
      ORDER BY name ASC, id ASC
    `);

    return NextResponse.json({
      success: true,
      items: result.rows,
    });
  } catch (error) {
    console.error("Get aid items error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil daftar barang bantuan",
      },
      { status: 500 },
    );
  }
}
